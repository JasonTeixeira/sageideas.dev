import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  organization_id: z.string().uuid(),
});

type MilestoneSeed = { name: string; days_offset?: number };
type TaskSeed = { title: string; milestone?: string };

function readMilestones(raw: unknown): MilestoneSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { name: unknown; days_offset?: unknown } => !!x && typeof x === 'object')
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      name: x.name as string,
      days_offset:
        typeof x.days_offset === 'number' ? x.days_offset : Number(x.days_offset ?? 0) || 0,
    }));
}

function readTasks(raw: unknown): TaskSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { title: unknown; milestone?: unknown } => !!x && typeof x === 'object')
    .filter((x) => typeof x.title === 'string')
    .map((x) => ({
      title: x.title as string,
      milestone: typeof x.milestone === 'string' ? x.milestone : undefined,
    }));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { organization_id } = parsed.data;

  const sb = supabaseAdmin();
  const { data: tmpl } = await sb
    .from('project_templates')
    .select(
      'id, name, service_type, description, default_milestones, default_tasks, default_target_days',
    )
    .eq('id', id)
    .maybeSingle();
  if (!tmpl) return notFound('Template not found');

  const { data: org } = await sb
    .from('organizations')
    .select('id')
    .eq('id', organization_id)
    .maybeSingle();
  if (!org) return badRequest('Unknown organization');

  const targetDays = Number(tmpl.default_target_days ?? 30);
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + targetDays);

  const milestones = readMilestones(tmpl.default_milestones);
  const tasks = readTasks(tmpl.default_tasks);

  const { data: engRow, error: engErr } = await sb
    .from('engagements')
    .insert({
      organization_id,
      title: tmpl.name as string,
      service_type: (tmpl.service_type as string | null) ?? 'consulting',
      status: 'active',
      start_date: today.toISOString().slice(0, 10),
      target_date: targetDate.toISOString().slice(0, 10),
      description: (tmpl.description as string | null) ?? null,
      pipeline_stage: 'active',
    })
    .select('id')
    .single();
  if (engErr || !engRow) return serverError(engErr?.message ?? 'Engagement insert failed');
  const engagementId = engRow.id as string;

  // Insert milestones (project_milestones).
  const milestoneRows = milestones.map((m, i) => {
    const due = new Date(today);
    due.setDate(due.getDate() + (m.days_offset ?? 0));
    return {
      engagement_id: engagementId,
      title: m.name,
      due_date: due.toISOString().slice(0, 10),
      status: 'pending',
      position: i,
    };
  });
  let milestonesById: Map<string, string> = new Map();
  if (milestoneRows.length > 0) {
    const { data: insertedMs, error: msErr } = await sb
      .from('project_milestones')
      .insert(milestoneRows)
      .select('id, title');
    if (msErr) {
      // Engagement inserted; surface the error but don't roll back -- admin
      // can re-run after fixing schema.
      return serverError(`Engagement created but milestone seeding failed: ${msErr.message}`);
    }
    milestonesById = new Map(
      (insertedMs ?? []).map(
        (r) => [(r.title as string) ?? '', (r.id as string) ?? ''] as [string, string],
      ),
    );
  }

  // Insert tasks (linked to engagement; phase_id stays null since we use
  // project_milestones for this template, not phases).
  if (tasks.length > 0) {
    const taskRows = tasks.map((t, i) => ({
      engagement_id: engagementId,
      title: t.title,
      status: 'open',
      priority: 'normal',
      position: i,
    }));
    const { error: tErr } = await sb.from('tasks').insert(taskRows);
    if (tErr) {
      return serverError(`Engagement + milestones created but task seeding failed: ${tErr.message}`);
    }
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'engagement.from_template',
    entityType: 'engagement',
    entityId: engagementId,
    after: {
      template_id: id,
      template_name: tmpl.name,
      organization_id,
      milestone_count: milestones.length,
      task_count: tasks.length,
    },
  });

  return NextResponse.json({
    engagement_id: engagementId,
    milestone_ids: Array.from(milestonesById.values()),
  });
}

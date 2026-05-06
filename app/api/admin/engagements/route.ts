import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

const STAGES = [
  'discovery',
  'proposal',
  'contract',
  'active',
  'review',
  'complete',
  'archived',
] as const;

const CreateSchema = z.object({
  organization_id: z.string().uuid('Pick an organization'),
  title: z.string().trim().min(1, 'Title is required').max(200),
  pipeline_stage: z.enum(STAGES).default('discovery'),
  owner_id: z.string().uuid().optional().nullable(),
  contract_value: z.number().nonnegative().optional().nullable(),
  budget_hours: z.number().nonnegative().optional().nullable(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date')
    .optional()
    .nullable(),
});

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const sb = supabaseAdmin();

  const { data: posRow } = await sb
    .from('engagements')
    .select('kanban_position')
    .eq('pipeline_stage', data.pipeline_stage)
    .order('kanban_position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (posRow?.kanban_position ?? -1) + 1;

  const insert = {
    organization_id: data.organization_id,
    title: data.title,
    pipeline_stage: data.pipeline_stage,
    status: 'active' as const,
    owner_id: data.owner_id ?? null,
    contract_value: data.contract_value ?? null,
    budget_hours: data.budget_hours ?? null,
    start_date: data.start_date ?? null,
    kanban_position: nextPosition,
  };

  const { data: row, error } = await sb
    .from('engagements')
    .insert(insert)
    .select('id, title, pipeline_stage')
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'insert_failed' }, { status: 400 });
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'engagement.create',
    entityType: 'engagement',
    entityId: row.id,
    after: insert,
  });

  return NextResponse.json(row);
}

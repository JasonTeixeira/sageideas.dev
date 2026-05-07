import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  serverError,
} from '@/lib/api-errors';
import {
  loadFormDefinitionForEngagement,
  parseIntakeSchema,
  validateAnswers,
} from '@/lib/portal/intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  form_id: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { form_id, answers } = parsed.data;

  // Normalize answers to strings for storage + validation.
  const stringAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (v == null) continue;
    stringAnswers[k] = typeof v === 'string' ? v : String(v);
  }

  const sb = supabaseAdmin();
  const { data: engRow } = await sb
    .from('engagements')
    .select(
      'id, organization_id, service_type, intake_form_id, intake_submitted_at, title',
    )
    .eq('id', id)
    .maybeSingle();
  if (!engRow) return notFound('Engagement not found');
  if (!ctx.isAdmin && engRow.organization_id !== ctx.organizationId) {
    return forbidden();
  }

  if (engRow.intake_submitted_at) {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
  }

  // Load definition (prefer body's form_id, fall back to engagement helper).
  const { data: def } = await sb
    .from('intake_form_definitions')
    .select('id, schema, is_active')
    .eq('id', form_id)
    .maybeSingle();
  let definition = def
    ? {
        id: def.id as string,
        schema: parseIntakeSchema(def.schema),
        is_active: (def.is_active as boolean | null) ?? true,
      }
    : null;
  if (!definition) {
    const fallback = await loadFormDefinitionForEngagement({
      engagement: {
        id: engRow.id as string,
        intake_form_id: (engRow.intake_form_id as string | null) ?? null,
        service_type: (engRow.service_type as string | null) ?? null,
      },
      sb,
    });
    if (fallback) {
      definition = { id: fallback.id, schema: fallback.schema, is_active: true };
    }
  }
  if (!definition) return badRequest('No intake form definition available');
  if (definition.is_active === false) return badRequest('This intake form is no longer active');

  const v = validateAnswers(definition.schema, stringAnswers);
  if (!v.ok) {
    return badRequest(`Missing required fields: ${v.missing.join(', ')}`);
  }

  const now = new Date().toISOString();
  const { error: updErr } = await sb
    .from('engagements')
    .update({
      intake: stringAnswers,
      intake_submitted_at: now,
      intake_form_id: definition.id,
    })
    .eq('id', engRow.id);
  if (updErr) return serverError(updErr.message);

  // Insert a Kickoff milestone if not already there.
  try {
    const { data: existing } = await sb
      .from('project_milestones')
      .select('id')
      .eq('engagement_id', engRow.id)
      .ilike('title', 'kickoff')
      .limit(1);
    if (!existing || existing.length === 0) {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      await sb.from('project_milestones').insert({
        engagement_id: engRow.id,
        title: 'Kickoff',
        due_date: due.toISOString().slice(0, 10),
        status: 'in_progress',
        position: 0,
      });
    }
  } catch {
    // non-fatal
  }

  // Audit log row.
  try {
    await sb.from('audit_log').insert({
      action: 'engagement.intake_submitted',
      entity_type: 'engagement',
      entity_id: engRow.id,
      organization_id: engRow.organization_id,
      actor_id: ctx.user.id,
      after: {
        engagement_id: engRow.id,
        form_id: definition.id,
        field_count: Object.keys(stringAnswers).length,
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, engagement_id: engRow.id });
}

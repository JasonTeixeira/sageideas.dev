import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  serverError,
} from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  engagement_id: z.string().uuid().nullable().optional(),
  meeting_kind: z.enum(['kickoff', 'review', 'status', 'adhoc']),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId && !ctx.isAdmin) return forbidden('No active organization');

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;

  const startMs = new Date(body.starts_at).getTime();
  const endMs = new Date(body.ends_at).getTime();
  if (!(endMs > startMs)) return badRequest('ends_at must be after starts_at');
  if (startMs < Date.now() - 60_000) return badRequest('Slot is in the past');

  const sb = supabaseAdmin();

  // If an engagement was picked, verify the caller has access AND derive its
  // org so we don't trust the active-org cookie blindly across orgs.
  let orgId: string | null = ctx.organizationId;
  if (body.engagement_id) {
    const { data: engRow } = await sb
      .from('engagements')
      .select('id, organization_id')
      .eq('id', body.engagement_id)
      .maybeSingle();
    if (!engRow) return badRequest('Engagement not found');
    if (!ctx.isAdmin && engRow.organization_id !== ctx.organizationId) {
      return forbidden();
    }
    orgId = (engRow.organization_id as string | null) ?? orgId;
  }
  if (!orgId) return badRequest('No organization context');

  // Race-safe overlap check: re-query bookings touching this window and
  // verify none overlaps before insert. Storage trigger could harden further;
  // for now this is best-effort + the unique ics_uid + status checks.
  const { data: clashing } = await sb
    .from('bookings')
    .select('id, starts_at, ends_at, status')
    .lt('starts_at', body.ends_at)
    .gt('ends_at', body.starts_at)
    .eq('status', 'confirmed');
  if ((clashing ?? []).length > 0) {
    return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }

  const icsUid = `${randomUUID()}@sageideas.dev`;
  const { data: inserted, error } = await sb
    .from('bookings')
    .insert({
      organization_id: orgId,
      engagement_id: body.engagement_id ?? null,
      booked_by: ctx.user.id,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      meeting_kind: body.meeting_kind,
      notes: body.notes ?? null,
      status: 'confirmed',
      ics_uid: icsUid,
    })
    .select('id, starts_at, ends_at, meeting_kind, ics_uid')
    .single();
  if (error || !inserted) return serverError(error?.message ?? 'Insert failed');

  // Audit row (best-effort).
  try {
    await sb.from('audit_log').insert({
      action: 'booking.created',
      entity_type: 'booking',
      entity_id: inserted.id,
      organization_id: orgId,
      actor_id: ctx.user.id,
      after: {
        booking_id: inserted.id,
        engagement_id: body.engagement_id ?? null,
        meeting_kind: body.meeting_kind,
        starts_at: body.starts_at,
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, booking: inserted });
}

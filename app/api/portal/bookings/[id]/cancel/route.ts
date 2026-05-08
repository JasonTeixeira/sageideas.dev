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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId && !ctx.isAdmin) return forbidden('No active organization');

  const { id } = await params;
  if (!id || typeof id !== 'string') return badRequest('Missing booking id');

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // empty body is fine
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { reason } = parsed.data;

  const sb = supabaseAdmin();

  const { data: booking, error: fetchErr } = await sb
    .from('bookings')
    .select('id, organization_id, booked_by, status, starts_at, meeting_kind')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return serverError(fetchErr.message);
  if (!booking) return notFound('Booking not found');

  // Authorization: admin OR member of the booking's org.
  if (!ctx.isAdmin && booking.organization_id !== ctx.organizationId) {
    return forbidden();
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ ok: true, already: true, booking });
  }
  if (booking.status === 'completed') {
    return badRequest('Booking is already completed');
  }
  if (new Date(booking.starts_at as string).getTime() < Date.now()) {
    return badRequest('Cannot cancel a booking after it has started');
  }

  const { data: updated, error: updErr } = await sb
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      notes: reason ? `[cancelled] ${reason}` : undefined,
    })
    .eq('id', id)
    .select('id, status, cancelled_at, starts_at, ends_at, meeting_kind')
    .single();
  if (updErr || !updated) return serverError(updErr?.message ?? 'Update failed');

  try {
    await sb.from('audit_log').insert({
      action: 'booking.cancelled',
      entity_type: 'booking',
      entity_id: id,
      organization_id: booking.organization_id,
      actor_id: ctx.user.id,
      before: { status: booking.status },
      after: { status: 'cancelled', reason: reason ?? null },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, booking: updated });
}

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, notFound, serverError } from '@/lib/api-errors';
import { dispatchEvent } from '@/app/api/stripe/webhook/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  if (!id) return badRequest('Missing event id');

  const sb = supabaseAdmin();
  const { data: row, error: fetchErr } = await sb
    .from('stripe_webhook_events')
    .select('event_id, event_type, status, payload')
    .eq('event_id', id)
    .maybeSingle();
  if (fetchErr) return serverError(fetchErr.message);
  if (!row) return notFound('Webhook event not found');

  if (row.status === 'processed') {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  const payload = row.payload as Stripe.Event | null;
  if (!payload || typeof payload !== 'object') {
    return badRequest('Stored payload is missing or invalid');
  }

  try {
    await dispatchEvent(sb, payload);
    await sb
      .from('stripe_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error: null })
      .eq('event_id', id);
    await logAudit({
      actorId: guard.userId,
      actorEmail: guard.email,
      action: 'stripe_webhook_event.retry',
      entityType: 'stripe_webhook_event',
      entityId: id,
      after: { status: 'processed', event_type: row.event_type },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb
      .from('stripe_webhook_events')
      .update({ status: 'failed', error: msg.slice(0, 1000) })
      .eq('event_id', id);
    await logAudit({
      actorId: guard.userId,
      actorEmail: guard.email,
      action: 'stripe_webhook_event.retry_failed',
      entityType: 'stripe_webhook_event',
      entityId: id,
      after: { status: 'failed', error: msg.slice(0, 200) },
    });
    return serverError(msg);
  }
}

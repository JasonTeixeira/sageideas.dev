import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { assertSupabaseSuccess, billingIdempotencyKey } from '@/lib/billing/integrity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const { id } = await params;
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const localLookup = await sb
    .from('stripe_subscriptions')
    .select('stripe_subscription_id')
    .eq('stripe_subscription_id', id)
    .maybeSingle();
  const localSubscription = assertSupabaseSuccess(localLookup, 'subscription ownership lookup');
  if (!localSubscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const stripe = getStripe();
  try {
    const updated = await stripe.subscriptions.update(
      id,
      { cancel_at_period_end: true },
      { idempotencyKey: billingIdempotencyKey('subscription-cancel', id) },
    );

    const persistence = await sb
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        status: updated.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', id);
    assertSupabaseSuccess(persistence, 'subscription cancellation persistence');

    return NextResponse.json({
      subscription_id: updated.id,
      cancel_at_period_end: updated.cancel_at_period_end,
      status: updated.status,
    });
  } catch (err) {
    console.error('[stripe/subscription/cancel]', err);
    return NextResponse.json({ error: 'Cancel failed' }, { status: 500 });
  }
}

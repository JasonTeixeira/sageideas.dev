import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  await requireAdmin();

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const stripe = getStripe();
  try {
    const updated = await stripe.subscriptions.update(id, {
      cancel_at_period_end: true,
    });

    const sb = supabaseAdmin();
    await sb
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        status: updated.status,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', id);

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

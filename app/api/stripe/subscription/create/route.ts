import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getStripe,
  getOrCreateCustomer,
  isStripeConfigured,
} from '@/lib/stripe/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Interval = 'day' | 'week' | 'month' | 'year';

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }
  await requireAdmin();

  let body: {
    engagement_id?: string;
    price_amount?: number;
    interval?: string;
    interval_count?: number;
    currency?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const engagementId = body.engagement_id?.trim();
  const priceAmount = Number(body.price_amount);
  const rawInterval = (body.interval ?? '').toLowerCase();
  // Map "quarter" → month with interval_count 3 since Stripe doesn't support quarter directly.
  let interval: Interval;
  let intervalCount = body.interval_count ?? 1;
  if (rawInterval === 'quarter' || rawInterval === 'quarterly') {
    interval = 'month';
    intervalCount = 3;
  } else if (
    rawInterval === 'month' ||
    rawInterval === 'monthly'
  ) {
    interval = 'month';
  } else if (rawInterval === 'year' || rawInterval === 'yearly' || rawInterval === 'annual') {
    interval = 'year';
  } else if (rawInterval === 'week' || rawInterval === 'day') {
    interval = rawInterval as Interval;
  } else {
    return NextResponse.json(
      { error: 'interval must be one of month|quarter|year|week|day' },
      { status: 400 },
    );
  }

  if (!engagementId) {
    return NextResponse.json({ error: 'engagement_id required' }, { status: 400 });
  }
  if (!priceAmount || priceAmount <= 0) {
    return NextResponse.json({ error: 'price_amount (cents) required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: eng } = await sb
    .from('engagements')
    .select('id, organization_id, title')
    .eq('id', engagementId)
    .maybeSingle();
  if (!eng) {
    return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  }

  let customerId: string;
  try {
    customerId = await getOrCreateCustomer(eng.organization_id);
  } catch (err) {
    console.error('[stripe/subscription/create] customer', err);
    return NextResponse.json({ error: 'Customer creation failed' }, { status: 500 });
  }

  const stripe = getStripe();
  try {
    const product = await stripe.products.create({
      name: body.description ?? eng.title ?? 'Engagement subscription',
      metadata: { engagement_id: eng.id, organization_id: eng.organization_id },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: body.currency ?? 'usd',
            unit_amount: priceAmount,
            product: product.id,
            recurring: { interval, interval_count: intervalCount },
          },
        },
      ],
      metadata: { engagement_id: eng.id, organization_id: eng.organization_id },
    });

    const item = subscription.items.data[0];
    const price = item?.price;
    const periodEndUnix = (subscription as typeof subscription & { current_period_end?: number })
      .current_period_end;

    await sb.from('stripe_subscriptions').upsert(
      {
        engagement_id: eng.id,
        organization_id: eng.organization_id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status,
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        price_amount: price?.unit_amount ?? priceAmount,
        price_currency: price?.currency ?? body.currency ?? 'usd',
        interval: price?.recurring?.interval ?? interval,
      },
      { onConflict: 'stripe_subscription_id' },
    );

    await sb
      .from('engagements')
      .update({
        stripe_subscription_id: subscription.id,
        billing_cadence:
          rawInterval === 'quarter' || rawInterval === 'quarterly'
            ? 'quarterly'
            : interval === 'month'
              ? 'monthly'
              : interval === 'year'
                ? 'annual'
                : 'monthly',
      })
      .eq('id', eng.id);

    return NextResponse.json({
      subscription_id: subscription.id,
      status: subscription.status,
    });
  } catch (err) {
    console.error('[stripe/subscription/create] create', err);
    return NextResponse.json(
      { error: 'Subscription creation failed' },
      { status: 500 },
    );
  }
}

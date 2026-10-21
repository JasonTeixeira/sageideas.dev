import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getStripe,
  getOrCreateCustomer,
  isStripeConfigured,
} from '@/lib/stripe/client';
import {
  assertSupabaseSuccess,
  billingIdempotencyKey,
  toPositiveIntegerCents,
} from '@/lib/billing/integrity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Interval = 'day' | 'week' | 'month' | 'year';

export async function POST(req: Request) {
  await requireAdmin();
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

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
  const normalizedPriceAmount = toPositiveIntegerCents(priceAmount / 100);
  const currency = (body.currency ?? 'usd').trim().toLowerCase();
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
  if (normalizedPriceAmount === null || normalizedPriceAmount !== priceAmount) {
    return NextResponse.json({ error: 'price_amount (cents) required' }, { status: 400 });
  }
  if (!/^[a-z]{3}$/.test(currency)) {
    return NextResponse.json({ error: 'currency must be a three-letter code' }, { status: 400 });
  }
  if (!Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 12) {
    return NextResponse.json({ error: 'interval_count must be an integer from 1 to 12' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const engagementLookup = await sb
    .from('engagements')
    .select('id, organization_id, title, stripe_subscription_id')
    .eq('id', engagementId)
    .maybeSingle();
  const eng = assertSupabaseSuccess(engagementLookup, 'subscription engagement lookup');
  if (!eng) {
    return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  }
  if (eng.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'Engagement already has a Stripe subscription' },
      { status: 409 },
    );
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
    const product = await stripe.products.create(
      {
        name: body.description?.trim().slice(0, 250) || eng.title || 'Engagement subscription',
        metadata: { engagement_id: eng.id, organization_id: eng.organization_id },
      },
      {
        idempotencyKey: billingIdempotencyKey('engagement-product', eng.id),
      },
    );

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [
          {
            price_data: {
              currency,
              unit_amount: normalizedPriceAmount,
              product: product.id,
              recurring: { interval, interval_count: intervalCount },
            },
          },
        ],
        metadata: { engagement_id: eng.id, organization_id: eng.organization_id },
      },
      {
        idempotencyKey: billingIdempotencyKey(
          'engagement-subscription',
          eng.id,
          normalizedPriceAmount,
          currency,
          interval,
          intervalCount,
        ),
      },
    );

    const item = subscription.items.data[0];
    const price = item?.price;
    const periodEndUnix = (subscription as typeof subscription & { current_period_end?: number })
      .current_period_end;

    const subscriptionPersistence = await sb.from('stripe_subscriptions').upsert(
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
        price_amount: price?.unit_amount ?? normalizedPriceAmount,
        price_currency: price?.currency ?? currency,
        interval: price?.recurring?.interval ?? interval,
      },
      { onConflict: 'stripe_subscription_id' },
    );
    assertSupabaseSuccess(subscriptionPersistence, 'subscription persistence');

    const engagementPersistence = await sb
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
    assertSupabaseSuccess(engagementPersistence, 'engagement subscription persistence');

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

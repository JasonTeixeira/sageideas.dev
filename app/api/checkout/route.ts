import { NextRequest, NextResponse } from 'next/server'
import {
  getAcademyProductBySlug,
  isAcademyPaidEnrollmentEnabled,
} from '@/data/academy/products'
import { tiersBySlug } from '@/data/services/tiers'
import { careTiersBySlug } from '@/data/services/tiers'
import { isSelfServe } from '@/data/services/tier-classification'
import { rateLimit } from '@/lib/rate-limit'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'
import { getAcademyPriceId, type PlanInterval } from '@/lib/academy/plans'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { billingIdempotencyKey } from '@/lib/billing/integrity'

export const runtime = 'nodejs'

// Rate limit is intentionally tight (10/60s) — this is a payment endpoint.
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'checkout' })
  if (limited) return limited

  // Parse + validate body first — these steps need no Stripe env.
  let body: { slug?: string; kind?: string; interval?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const kind = typeof body?.kind === 'string' ? body.kind.trim() : ''
  const requestKey = req.headers.get('idempotency-key')?.trim() ?? ''
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) {
    return NextResponse.json({ error: 'A valid idempotency key is required' }, { status: 400 })
  }

  // All-access Academy membership ($20/mo · $200/yr). No slug — keyed to the
  // signed-in learner so the subscription maps to their account.
  if (kind === 'academy_allaccess') {
    if (!isAcademyPaidEnrollmentEnabled()) {
      return NextResponse.json({ error: 'Academy paid enrollment is not open.' }, { status: 409 })
    }
    const interval: PlanInterval = body?.interval === 'yearly' ? 'yearly' : 'monthly'
    const priceId = getAcademyPriceId(interval)
    if (!priceId) {
      return NextResponse.json({ error: 'Membership checkout is not live yet.' }, { status: 409 })
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
    }

    const sb = await createSupabaseServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to start your membership.', signIn: '/login?next=/academy/join' },
        { status: 401 },
      )
    }

    const stripe = getStripe()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'
    const idempotencyKey = billingIdempotencyKey(
      'academy-allaccess-checkout', user.id, interval, requestKey,
    )

    const meta = { kind: 'academy_allaccess', user_id: user.id, email: user.email ?? '', plan_interval: interval }

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: user.email ?? undefined,
          success_url: `${base}/academy/dashboard?welcome=1&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/academy/join?checkout=cancelled`,
          billing_address_collection: 'auto',
          allow_promotion_codes: true,
          metadata: meta,
          // 7-day free trial (card up front, opt-out): full access now, first
          // charge on day 7 unless cancelled. subscription mode still collects
          // the payment method, so it auto-converts.
          subscription_data: { metadata: meta, trial_period_days: 7 },
        },
        { idempotencyKey },
      )
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] academy_allaccess stripe error:', err)
      return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 })
    }
  }

  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!slug || slug.length > 64) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (kind === 'academy') {
    const product = getAcademyProductBySlug(slug)
    if (!product) {
      return NextResponse.json({ error: 'Unknown academy product' }, { status: 400 })
    }
    if (!product.stripePriceId || product.status !== 'checkout_ready') {
      return NextResponse.json(
        { error: 'Academy checkout is not live yet. Join early access instead.' },
        { status: 409 },
      )
    }
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
    }

    const stripe = getStripe()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'

    const idempotencyKey = billingIdempotencyKey(
      'academy-checkout', product.trackSlug, requestKey,
    )

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: product.stripePriceId, quantity: 1 }],
          success_url: `${base}/academy/${product.trackSlug}/enroll?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/academy/${product.trackSlug}/enroll?checkout=cancelled`,
          billing_address_collection: 'auto',
          customer_creation: 'always',
          automatic_tax: { enabled: false },
          allow_promotion_codes: true,
          metadata: {
            kind: 'academy',
            track_slug: product.trackSlug,
            product_name: product.name,
          },
          payment_intent_data: {
            metadata: { kind: 'academy', track_slug: product.trackSlug },
          },
        },
        { idempotencyKey },
      )
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] academy stripe error:', err)
      return NextResponse.json(
        { error: "Couldn't start checkout. Please try again." },
        { status: 502 },
      )
    }
  }

  // Resolve the slug to either a one-time service tier or a care retainer.
  const tier = tiersBySlug[slug]
  const careTier = careTiersBySlug[slug]

  if (tier) {
    // One-time self-serve tiers only — custom/monthly/non-self-serve → book a call.
    if (!isSelfServe(tier)) {
      return NextResponse.json(
        { error: 'This engagement is by consultation — please book a call.' },
        { status: 400 },
      )
    }

    // Slug is valid and self-serve — now we need Stripe.
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
    }

    const stripe = getStripe()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'

    const idempotencyKey = billingIdempotencyKey(
      'service-checkout', tier.slug, requestKey,
    )

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: tier.stripePriceId!, quantity: 1 }],
          success_url: `${base}/checkout/success?slug=${tier.slug}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/checkout/cancel?slug=${tier.slug}`,
          billing_address_collection: 'auto',
          customer_creation: 'always',
          automatic_tax: { enabled: false },
          allow_promotion_codes: true,
          metadata: { kind: 'service', slug: tier.slug, tier_name: tier.name },
          payment_intent_data: { metadata: { kind: 'service', slug: tier.slug } },
        },
        { idempotencyKey },
      )
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] stripe error:', err)
      return NextResponse.json(
        { error: "Couldn't start checkout. Please try again." },
        { status: 502 },
      )
    }
  }

  if (careTier) {
    // Care retainer subscription — monthly cadence, mode: 'subscription'.
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Checkout unavailable' }, { status: 503 })
    }

    const stripe = getStripe()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'

    const idempotencyKey = billingIdempotencyKey(
      'care-checkout', careTier.slug, requestKey,
    )

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: [{ price: careTier.stripePriceId, quantity: 1 }],
          success_url: `${base}/checkout/success?slug=${careTier.slug}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/checkout/cancel?slug=${careTier.slug}`,
          billing_address_collection: 'auto',
          automatic_tax: { enabled: false },
          metadata: { kind: 'care', tier_slug: careTier.slug, tier_name: careTier.name },
          subscription_data: {
            metadata: { kind: 'care', tier_slug: careTier.slug, tier_name: careTier.name },
          },
        },
        { idempotencyKey },
      )
      return NextResponse.json({ url: session.url })
    } catch (err) {
      console.error('[checkout] stripe error:', err)
      return NextResponse.json(
        { error: "Couldn't start checkout. Please try again." },
        { status: 502 },
      )
    }
  }

  // Slug matched neither a known service tier nor a care retainer.
  return NextResponse.json(
    { error: 'This engagement is by consultation — please book a call.' },
    { status: 400 },
  )
}

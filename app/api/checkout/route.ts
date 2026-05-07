import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { tiersBySlug, careTiersBySlug } from '@/data/services/tiers'
import { rateLimit } from '@/lib/rate-limit'

type CheckoutTarget = {
  slug: string
  name: string
  stripePriceId?: string
  cadence: 'one-time' | 'monthly' | 'custom'
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: 'checkout' })
  if (limited) return limited

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 })
  }

  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { slug } = body
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  // Look up either a productized tier or a Care retainer
  const tier = tiersBySlug[slug]
  const care = careTiersBySlug[slug]
  let target: CheckoutTarget | null = null
  if (tier) {
    target = {
      slug: tier.slug,
      name: tier.name,
      stripePriceId: tier.stripePriceId,
      cadence: tier.cadence,
    }
  } else if (care) {
    target = {
      slug: care.slug,
      name: care.name,
      stripePriceId: care.stripePriceId,
      cadence: care.cadence,
    }
  }

  if (!target) {
    return NextResponse.json({ error: `Unknown slug: ${slug}` }, { status: 404 })
  }

  // Custom-cadence tiers (Build) should route to /book, not Stripe
  if (target.cadence === 'custom') {
    return NextResponse.json({ error: 'This tier requires a discovery call.' }, { status: 422 })
  }

  if (!target.stripePriceId) {
    return NextResponse.json({ error: 'No Stripe price configured for this offering' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'

  const mode = target.cadence === 'monthly' ? 'subscription' : 'payment'

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: target.stripePriceId, quantity: 1 }],
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    billing_address_collection: 'auto',
    automatic_tax: { enabled: false },
    metadata: { tier_slug: target.slug, tier_name: target.name },
  }

  if (mode === 'payment') {
    sessionParams.customer_creation = 'always'
  }

  // Stable key per (ip, slug, day) so a refresh doesn't open a second
  // session — anonymous tier checkout has no user id available.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const dayBucket = new Date().toISOString().slice(0, 10)
  const idempotencyKey = createHash('sha256')
    .update(`tier:${target.slug}:${ip}:${dayBucket}`)
    .digest('hex')

  const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey })

  return NextResponse.json({ url: session.url })
}

import { NextResponse } from 'next/server'
import {
  createSupabaseServerClient,
  isSupabasePublicConfigured,
  supabaseAdmin,
} from '@/lib/supabase/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Opens the real Stripe customer portal for the signed-in learner's all-access
 * membership. This is what powers "change plan" and "cancel" on the Settings
 * page — no fake links: if there is no real Stripe customer, we say so.
 */
export async function POST(): Promise<NextResponse> {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: 'Authentication unavailable.' }, { status: 503 })
  }

  const sb = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: 'Billing is not available right now.' }, { status: 503 })
  }

  const admin = supabaseAdmin()
  const { data: sub } = await admin
    .from('academy_allaccess_subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', user.id)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found.' }, { status: 404 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev'

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${base}/academy/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[academy/billing/portal] failed to create portal session', err)
    return NextResponse.json({ error: "Couldn't open billing. Please try again." }, { status: 502 })
  }
}

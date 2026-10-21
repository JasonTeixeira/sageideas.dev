import type Stripe from 'stripe'
import type { supabaseAdmin } from '@/lib/supabase/server'
import type { PlanInterval } from '@/lib/academy/plans'
import { assertSupabaseSuccess } from '@/lib/billing/integrity'

type Sb = ReturnType<typeof supabaseAdmin>

/** Stripe subscription statuses that should grant access. */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export type AcademyMembership = {
  status: string
  planInterval: PlanInterval
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

function intervalFromStripe(interval: string | null | undefined): PlanInterval {
  return interval === 'year' ? 'yearly' : 'monthly'
}

/**
 * Upsert an all-access membership row from a Stripe Subscription object.
 * Idempotent on stripe_subscription_id. Only acts on subscriptions tagged
 * kind=academy_allaccess so it never collides with org/care subscriptions.
 */
export async function upsertAcademyMembershipFromSubscription(sb: Sb, sub: Stripe.Subscription): Promise<boolean> {
  if (sub.metadata?.kind !== 'academy_allaccess') return false

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  const item = sub.items.data[0]
  const price = item?.price
  const periodEndUnix = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end
  const userId = sub.metadata?.user_id || null
  const email = sub.metadata?.email || null

  if (!email) {
    // Without an email we can't key the membership to a learner — surface loudly.
    throw new Error(`academy_allaccess subscription ${sub.id} missing email metadata`)
  }

  const result = await sb.from('academy_allaccess_subscriptions').upsert(
    {
      user_id: userId,
      email,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      status: sub.status,
      plan_interval: intervalFromStripe(price?.recurring?.interval),
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      price_amount: price?.unit_amount ?? null,
      price_currency: price?.currency ?? 'usd',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  )
  assertSupabaseSuccess(result, 'academy membership upsert')
  return true
}

/** Mark a membership canceled. No-op if the subscription id isn't one of ours. */
export async function cancelAcademyMembership(sb: Sb, subId: string): Promise<void> {
  const result = await sb
    .from('academy_allaccess_subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId)
  assertSupabaseSuccess(result, 'academy membership cancellation')
}

/**
 * Read the current learner's active membership (if any). `sb` here is an
 * RLS-scoped server client so the own-row policy applies. Returns null when
 * not signed in or no active membership.
 */
export async function getActiveMembership(sb: Sb, userId: string): Promise<AcademyMembership | null> {
  const { data } = await sb
    .from('academy_allaccess_subscriptions')
    .select('status, plan_interval, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  if (!ACTIVE_STATUSES.has(data.status)) return null
  // A canceled-but-still-paid period stays active until current_period_end.
  if (data.current_period_end && new Date(data.current_period_end).getTime() < Date.now()) return null

  return {
    status: data.status,
    planInterval: (data.plan_interval as PlanInterval) ?? 'monthly',
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  }
}

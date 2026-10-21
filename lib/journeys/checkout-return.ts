import { careTiersBySlug, tiersBySlug } from '@/data/services/tiers'
import { supabaseAdmin } from '@/lib/supabase/server'

export type CheckoutReturnState = {
  status: 'confirmed' | 'pending' | 'partially_refunded' | 'refunded' | 'invalid'
  slug?: string
}

type Fulfillment = {
  kind: 'service' | 'care'
  status: 'completed' | 'partially_refunded' | 'refunded'
  metadata: Record<string, unknown> | null
}

const CHECKOUT_SESSION_ID = /^cs_(?:test_|live_)?[A-Za-z0-9]{12,}$/

export function classifyCheckoutReturn(
  rawSlug: unknown,
  rawSessionId: unknown,
  fulfillment: Fulfillment | null,
): CheckoutReturnState {
  const slug = typeof rawSlug === 'string' ? rawSlug.trim() : ''
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : ''
  const service = tiersBySlug[slug]
  const care = careTiersBySlug[slug]

  if ((!service && !care) || !CHECKOUT_SESSION_ID.test(sessionId)) return { status: 'invalid' }
  if (!fulfillment) return { status: 'pending', slug }

  const expectedKind = care ? 'care' : 'service'
  const metadataSlug = expectedKind === 'care'
    ? fulfillment.metadata?.tier_slug
    : fulfillment.metadata?.slug
  if (fulfillment.kind !== expectedKind || metadataSlug !== slug) return { status: 'invalid' }

  if (fulfillment.status === 'partially_refunded') return { status: 'partially_refunded', slug }
  if (fulfillment.status === 'refunded') return { status: 'refunded', slug }
  return { status: 'confirmed', slug }
}

export async function getCheckoutReturnState(
  rawSlug: unknown,
  rawSessionId: unknown,
): Promise<CheckoutReturnState> {
  const preflight = classifyCheckoutReturn(rawSlug, rawSessionId, null)
  if (preflight.status === 'invalid') return preflight
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return preflight
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from('checkout_fulfillments')
      .select('kind, status, metadata')
      .eq('stripe_checkout_session_id', String(rawSessionId).trim())
      .maybeSingle()
    if (error) {
      console.error('[checkout/return] fulfillment lookup failed', error)
      return preflight
    }
    return classifyCheckoutReturn(rawSlug, rawSessionId, data as Fulfillment | null)
  } catch (error) {
    console.error('[checkout/return] fulfillment lookup unavailable', error)
    return preflight
  }
}

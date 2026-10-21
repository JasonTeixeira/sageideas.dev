'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import { isSelfServe } from '@/data/services/tier-classification'
import { trackEvent } from '@/lib/analytics/events'

export function CheckoutButton({
  tier,
  label,
  variant = 'primary',
}: {
  tier: Tier
  label?: string
  variant?: 'primary' | 'secondary'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Self-serve checkout: one-time engagements ≤ $2,500 with a configured Stripe price.
  // All other tiers (monthly, custom, or above the cap) route to inquiry/book.
  if (!isSelfServe(tier)) {
    const href = `/book?tier=${tier.slug}`
    return (
      <Button
        asChild
        size="lg"
        className={
          variant === 'primary'
            ? 'bg-[#3D5AFE] hover:bg-[#2F46D8] text-white font-medium'
            : 'border border-[var(--sage-border-strong)] bg-transparent text-[var(--sage-ink)] hover:border-[var(--sage-accent)] hover:bg-[rgba(61,90,254,0.10)] hover:text-[var(--sage-ink)]'
        }
      >
        <a href={href}>
          {label ?? tier.cta} <ArrowRight className="w-4 h-4 ml-1" />
        </a>
      </Button>
    )
  }

  const onClick = async () => {
    setLoading(true)
    setError(null)
    trackEvent('checkout_start', { slug: tier.slug, priceCents: tier.priceCents })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ slug: tier.slug }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(typeof data?.error === 'string' ? data.error : "Couldn't start checkout. Please try again.")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        disabled={loading}
        onClick={onClick}
        className={
          variant === 'primary'
            ? 'bg-[#3D5AFE] hover:bg-[#2F46D8] text-white font-medium'
            : 'border border-[var(--sage-border-strong)] bg-transparent text-[var(--sage-ink)] hover:border-[var(--sage-accent)] hover:bg-[rgba(61,90,254,0.10)] hover:text-[var(--sage-ink)]'
        }
      >
        {loading ? 'Loading…' : (label ?? tier.cta)}{' '}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
      {error && (
        <p className="text-xs text-[#F87171]" role="alert">{error}</p>
      )}
    </div>
  )
}

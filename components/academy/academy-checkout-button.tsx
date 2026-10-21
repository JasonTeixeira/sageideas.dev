'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AcademyProduct } from '@/data/academy/products'
import { trackEvent } from '@/lib/analytics/events'

type AcademyCheckoutButtonProps = {
  product: AcademyProduct
  earlyAccessHref?: string
}

export function AcademyCheckoutButton({
  product,
  earlyAccessHref = '#early-access',
}: AcademyCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const checkoutReady = product.status === 'checkout_ready' && Boolean(product.stripePriceId)

  if (!checkoutReady) {
    return (
      <Button
        asChild
        size="lg"
        className="bg-[var(--sage-accent)] font-medium text-white hover:bg-[#2F46D8]"
      >
        <a href={earlyAccessHref}>
          Join early access <ArrowRight className="ml-1 h-4 w-4" />
        </a>
      </Button>
    )
  }

  const onClick = async () => {
    setLoading(true)
    setError(null)
    trackEvent('checkout_start', {
      slug: product.trackSlug,
      priceCents: product.priceCents,
    })

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ kind: 'academy', slug: product.trackSlug }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(typeof data?.error === 'string' ? data.error : "Couldn't start checkout. Please try again.")
    } catch {
      setError('Network error. Please try again.')
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
        className="bg-[var(--sage-accent)] font-medium text-white hover:bg-[#2F46D8]"
      >
        {loading ? 'Loading...' : `Enroll for ${product.priceLabel}`}{' '}
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
      {error && (
        <p className="text-xs text-[#F87171]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import type { CareTier } from '@/data/services/tiers'

export function CareCheckoutButton({
  care,
  label,
  variant = 'primary',
}: {
  care: CareTier
  label?: string
  variant?: 'primary' | 'secondary'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: care.slug }),
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
            ? 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-[#FAFAFA] font-medium'
            : ''
        }
      >
        {loading ? 'Loading…' : (label ?? `Subscribe — ${care.price}/mo`)}{' '}
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
      {error && (
        <p className="text-xs text-[#F87171]" role="alert">{error}</p>
      )}
    </div>
  )
}

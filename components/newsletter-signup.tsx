'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { track } from '@/components/analytics/posthog-provider'

type Props = {
  source?: string
  variant?: 'inline' | 'card'
  headline?: string
  blurb?: string
}

export function NewsletterSignup({
  source = 'lab',
  variant = 'card',
  headline = 'Sage Ideas, in your inbox.',
  blurb = 'One short note per week — what we shipped, what worked, what we got wrong. No drip campaigns.',
}: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/lab/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setStatus('error')
        setErrorMsg(
          data?.error === 'invalid_email'
            ? 'That email looks invalid.'
            : 'Could not subscribe right now. Try again in a minute.',
        )
        return
      }
      setStatus('success')
      setEmail('')
      track('newsletter_subscribe', { source })
    } catch {
      setStatus('error')
      setErrorMsg('Could not subscribe right now. Try again in a minute.')
    }
  }

  const containerClass =
    variant === 'card'
      ? 'rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 sm:p-8'
      : ''

  return (
    <div className={containerClass}>
      {variant === 'card' && (
        <>
          <h3 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{headline}</h3>
          <p className="mt-2 text-[#A8A29E] leading-relaxed">{blurb}</p>
        </>
      )}

      {status === 'success' ? (
        <div className="flex items-center gap-3 rounded-lg border border-[#0ED3CF]/30 bg-[#0ED3CF]/10 px-4 py-3 mt-4 text-sm text-[#FAFAFA]">
          <Check className="h-4 w-4 text-[#0ED3CF]" />
          You are in. First note hits your inbox soon.
        </div>
      ) : (
        <form onSubmit={onSubmit} className={variant === 'card' ? 'mt-6' : ''}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`newsletter-${source}`}>
              Email
            </label>
            <input
              id={`newsletter-${source}`}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 rounded-lg border border-[#2A2826] bg-[#09090B] px-4 py-3 text-sm text-[#FAFAFA] placeholder:text-[#57534E] focus:border-[#0ED3CF] focus:outline-none focus:ring-1 focus:ring-[#0ED3CF]"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0ED3CF] px-5 py-3 text-sm font-medium text-[#09090B] transition-all hover:bg-[#0AA8A5] disabled:opacity-50"
            >
              {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
              {status !== 'submitting' && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
          {status === 'error' && errorMsg && (
            <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
          )}
          <p className="mt-3 text-xs text-[#57534E]">
            No spam. Unsubscribe in one click. We never share your email.
          </p>
        </form>
      )}
    </div>
  )
}

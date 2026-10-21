'use client'

import { useState, type FormEvent } from 'react'

const INK = '#F2EFE9'
const FAINT = '#9598A2'
const BLUE = '#3D5AFE'
const mono = { fontFamily: 'var(--font-mono), monospace' } as const

interface NewsletterSignupProps {
  emailLabel: string
  subscribeLabel: string
  successLabel: string
  invalidEmailLabel: string
  failureLabel: string
  unsubscribeLabel: string
}

type SubmissionState = 'idle' | 'busy' | 'done' | 'invalid' | 'error'

/** The footer's only stateful island. The surrounding Academy chrome stays server-rendered. */
export function NewsletterSignup({
  emailLabel,
  subscribeLabel,
  successLabel,
  invalidEmailLabel,
  failureLabel,
  unsubscribeLabel,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SubmissionState>('idle')

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!value || value.indexOf('@') < 1) {
      setState('invalid')
      return
    }

    setState('busy')
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'academy-footer' }),
      })
      setState(response.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div role="status" style={{ ...mono, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#18B663', padding: '10px 0' }}>
        ✓ {successLabel}
      </div>
    )
  }

  const errorMessage = state === 'invalid' ? invalidEmailLabel : state === 'error' ? failureLabel : ''

  return (
    <>
      <form onSubmit={subscribe} noValidate style={{ display: 'flex', gap: 8 }} aria-busy={state === 'busy'}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@work.dev"
          aria-label={emailLabel}
          aria-invalid={state === 'invalid' || state === 'error'}
          aria-describedby={errorMessage ? 'academy-newsletter-error' : undefined}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (state === 'invalid' || state === 'error') setState('idle')
          }}
          style={{
            flex: 1,
            minWidth: 0,
            background: '#0F0F13',
            border: `1px solid ${errorMessage ? '#E5484D' : '#2A2A33'}`,
            borderRadius: 10,
            padding: '10px 13px',
            fontSize: 13,
            color: INK,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={state === 'busy'}
          style={{
            background: BLUE,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '0 16px',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            opacity: state === 'busy' ? 0.7 : 1,
          }}
        >
          {subscribeLabel}
        </button>
      </form>
      <div id="academy-newsletter-error" role="status" aria-live="polite" style={{ ...mono, minHeight: 16, marginTop: 6, fontSize: 9.5, color: errorMessage ? '#E5484D' : FAINT }}>
        {errorMessage || unsubscribeLabel}
      </div>
    </>
  )
}

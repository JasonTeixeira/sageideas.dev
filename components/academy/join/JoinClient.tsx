'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AcademyPlan, PlanInterval } from '@/lib/academy/plans'
import { Icon } from '@/components/academy/ui/Icon'
import styles from './join.module.css'

const FEATURES = [
  'Every course, path, and future release',
  'Hands-on in-browser labs — write and run real code',
  'Quizzes and checkpoints that verify your work',
  'Earn shareable certificates as you finish',
  'Progress tracking and a personal learner dashboard',
  'Cancel anytime — keep access through the period you paid for',
]

export function JoinClient({
  plans,
  alreadyMember,
  signedIn,
}: {
  plans: Record<PlanInterval, AcademyPlan>
  alreadyMember: boolean
  signedIn: boolean
}) {
  const [interval, setInterval] = useState<PlanInterval>('yearly')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const plan = plans[interval]

  if (alreadyMember) {
    return (
      <div className={styles.root}>
        <div className={styles.wrap}>
          <div className={styles.member}>
            <div className={styles.memberGlyph} aria-hidden="true"><Icon name="check" size={24} /></div>
            <h1 className={styles.h1} style={{ fontSize: '2rem', margin: '0.6rem 0' }}>You&rsquo;re all-access</h1>
            <p className={styles.sub} style={{ margin: '0 auto' }}>
              Your membership is active. Every course, lab, and certificate is unlocked.
            </p>
            <Link href="/academy/dashboard" className={styles.memberLink}>
              Go to your dashboard
              <Icon name="arrow-right" size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const subscribe = () => {
    setMsg('')
    start(async () => {
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: JSON.stringify({ kind: 'academy_allaccess', interval }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 401 && data.signIn) {
          window.location.href = data.signIn
          return
        }
        if (res.ok && data.url) {
          window.location.href = data.url
          return
        }
        setMsg(data.error ?? "Couldn't start checkout. Please try again.")
      } catch {
        setMsg('Network error. Please try again.')
      }
    })
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <span className={styles.kicker}>Sage Academy · All-access</span>
        <h1 className={styles.h1}>Learn to build with AI — <em>everything, unlocked</em></h1>
        <p className={styles.sub}>
          One membership opens every course, every hands-on lab, and every certificate. Learn by
          actually building — not by watching.
        </p>

        <div className={styles.toggle} role="tablist" aria-label="Billing interval">
          <button role="tab" aria-selected={interval === 'monthly'} data-on={interval === 'monthly'} onClick={() => setInterval('monthly')}>
            Monthly
          </button>
          <button role="tab" aria-selected={interval === 'yearly'} data-on={interval === 'yearly'} onClick={() => setInterval('yearly')}>
            Yearly<span className={styles.save}>2 months free</span>
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardMain}>
            <span className={styles.planName}>All-access · {interval}</span>
            <div className={styles.priceRow}>
              <span className={styles.price}>{plan.price}</span>
              <span className={styles.cadence}>{plan.cadence}</span>
            </div>
            <p className={styles.note}>{plan.note ?? ' '}</p>
            <ul className={styles.features}>
              {FEATURES.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
          <div className={styles.cardSide}>
            <button type="button" className={styles.cta} onClick={subscribe} disabled={pending} aria-busy={pending}>
              {pending ? (
                'Starting…'
              ) : (
                <>
                  {signedIn ? 'Start 7-day free trial' : 'Sign in & start free trial'}
                  <Icon name="arrow-right" size={16} aria-hidden="true" />
                </>
              )}
            </button>
            <p className={styles.fine}>
              Free for 7 days, then {plan.price}{plan.cadence}. We&apos;ll remind you before it renews. Cancel anytime · secure checkout by Stripe.
            </p>
            <p className={styles.msg} role="status" aria-live="polite">{msg}</p>
          </div>
        </div>

        <div className={styles.guarantee}>
          <span><Icon name="refresh" size={14} aria-hidden="true" /> Cancel anytime</span>
          <span><Icon name="lock" size={14} aria-hidden="true" /> Keep access through the paid period</span>
          <span><Icon name="check" size={14} aria-hidden="true" /> New courses included</span>
        </div>
      </div>
    </div>
  )
}

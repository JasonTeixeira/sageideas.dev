'use client'

import { useState } from 'react'
import type { AcademyPlan, PlanInterval } from '@/lib/academy/plans'
import { trackEvent } from '@/lib/analytics/events'
import { useT } from '@/components/i18n/locale-provider'

/**
 * Sage Academy pricing surface — reskin of the rendered design at
 * design-source/rendered/pricing.html. Presentation only: the plan data and the
 * checkout wiring are the REAL Academy all-access plans (lib/academy/plans.ts)
 * hitting POST /api/checkout { kind: 'academy_allaccess', interval }. Monthly and
 * Annual are live Stripe subscriptions; Team has no self-serve Stripe plan and so
 * keeps its real mailto CTA rather than a fabricated checkout link.
 *
 * Palette (from the design): bg #0B0B0E · surface #111115 · ink #F2EFE9 ·
 * muted #9598A2 · lines #1E1E24 · accent #3D5AFE · green #18B663.
 */

const SERIF = 'Fraunces, Georgia, serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

const COLORS = {
  bg: '#0B0B0E',
  surface: '#111115',
  ink: '#F2EFE9',
  muted: '#9598A2',
  softMuted: '#9C9CA6',
  line: '#1E1E24',
  accent: '#3D5AFE',
  accentInk: '#8FA0FF',
  green: '#18B663',
  faint: '#4A4A54',
} as const

type Tier = {
  key: 'monthly' | 'annual' | 'team'
  name: string
  price: string
  per: string
  note: string
  feats: string[]
  cta: string
  highlight?: boolean
  sideTag?: string
  tick: string
  /** For live subscription tiers, the interval passed to the checkout API. */
  interval?: PlanInterval
  /** For non-self-serve tiers (Team), a plain href. */
  href?: string
}

type Faq = { q: string; a: string }

const ACADEMY_FAQ: Faq[] = [
  {
    q: 'Is this for beginners?',
    a: 'Course 00 assumes you can code a little and think a lot. Career-switchers start there plus Programming Fundamentals; working engineers can enter any live track. Nothing here is watch-and-nod content — expect to be wrong in public and fix it.',
  },
  {
    q: 'Monthly or annual?',
    a: 'Monthly is for trying the water — same access, cancel any month. Annual is two months cheaper and adds a yearly portfolio review. Most members switch to annual after their first shipped proof; the upgrade is prorated.',
  },
  {
    q: 'Why is the score capped instead of averaged?',
    a: "Because that's how a reviewer reads your work. They don't average your strong claims against your broken one — they stop at the broken one. The cap shows the exact repair that lifts it, so the honest number is also an actionable one.",
  },
  {
    q: 'How much time does it take?',
    a: 'A lesson is 20–40 minutes and ends in a proof. Recall is about six minutes a day. One sprint a week is the intended cadence — this is designed around a job, not instead of one.',
  },
  {
    q: 'Can I cancel?',
    a: 'Anytime, no lock-in — access runs to the end of the period you paid for, and you keep every artifact and proof you shipped. Try a full lesson free first, no card required.',
  },
]

const OUTCOMES = [
  'A portfolio of decision memos and passing proofs',
  'Retention that holds under pressure — recall at 1/3/7/30 days',
  'Honest mastery scores a reviewer would agree with',
  'Certificates verifiable by code, not screenshots',
]

function buildTiers(monthly: AcademyPlan, yearly: AcademyPlan, t: (source: string) => string): Tier[] {
  return [
    {
      key: 'monthly',
      name: t('Monthly'),
      price: monthly.price,
      per: t('/ month'),
      note: t('for trying the water'),
      feats: [
        t('Everything in the academy'),
        t('Cancel any month, keep your ledger'),
        t('Upgrade to annual anytime — prorated'),
      ],
      cta: t('Start monthly'),
      tick: COLORS.faint,
      interval: 'monthly',
    },
    {
      key: 'annual',
      name: t('Annual'),
      price: yearly.price,
      per: t('/ year'),
      note: t('≈ $21/month · billed yearly'),
      feats: [
        t('Everything in the academy'),
        t('Two months free vs monthly'),
        t('Yearly portfolio review checkpoint'),
        t('Price locked as new courses ship'),
      ],
      cta: t('Start annual'),
      highlight: true,
      sideTag: t('save 2 months'),
      tick: COLORS.accentInk,
      interval: 'yearly',
    },
    {
      key: 'team',
      name: t('Team'),
      price: '$190',
      per: t('/ seat · yr'),
      note: t('per seat / year · 5+ seats'),
      feats: [
        t('Everything, for every engineer'),
        t('Manager view of team evidence ledgers'),
        t('Cohort onboarding sprint'),
        t('Invoice billing + seat management'),
      ],
      cta: t('Talk to us'),
      tick: COLORS.green,
      href: 'mailto:hello@sageideas.dev?subject=Sage%20Academy%20—%20Team%20plan',
    },
  ]
}

function PlanCta({ tier }: { tier: Tier }) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textDecoration: 'none',
    fontSize: '14.5px',
    fontWeight: 600,
    padding: '14px 22px',
    borderRadius: '26px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    width: '100%',
    transition: 'filter 160ms ease, background 160ms ease',
  }

  const primary: React.CSSProperties = {
    ...baseStyle,
    color: '#fff',
    background: COLORS.accent,
    border: `1px solid ${COLORS.accent}`,
    boxShadow: '0 0 24px rgba(61,90,254,0.4)',
  }
  const secondary: React.CSSProperties = {
    ...baseStyle,
    color: COLORS.ink,
    background: 'transparent',
    border: '1px solid #2A2A33',
  }
  const style = tier.highlight ? primary : secondary

  // Team (no self-serve plan) → real mailto link, no checkout call.
  if (tier.href) {
    return (
      <a href={tier.href} style={style}>
        {tier.cta}
      </a>
    )
  }

  // Live subscription tiers → real Stripe checkout via /api/checkout.
  const onClick = async () => {
    if (!tier.interval) return
    setLoading(true)
    setError(null)
    trackEvent('checkout_start', { slug: `academy_allaccess_${tier.interval}`, priceCents: 0 })
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ kind: 'academy_allaccess', interval: tier.interval }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      if (typeof data?.signIn === 'string') {
        window.location.href = data.signIn
        return
      }
      setError(typeof data?.error === 'string' ? data.error : t("Couldn't start checkout. Please try again."))
    } catch {
      setError(t('Network error. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <button type="button" onClick={onClick} disabled={loading} style={{ ...style, opacity: loading ? 0.7 : 1 }}>
        {loading ? t('Loading…') : tier.cta}
      </button>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: '12px', color: '#F87171', textAlign: 'center' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function PlanCard({ tier }: { tier: Tier }) {
  const t = useT()
  const cardStyle: React.CSSProperties = tier.highlight
    ? {
        position: 'relative',
        border: '1px solid rgba(61,90,254,0.5)',
        borderRadius: '18px',
        background: 'linear-gradient(170deg, #14141C, #111115)',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(61,90,254,0.14), 0 32px 80px -32px rgba(0,0,0,0.85)',
      }
    : {
        position: 'relative',
        border: `1px solid ${COLORS.line}`,
        borderRadius: '18px',
        background: COLORS.surface,
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
      }

  return (
    <div style={cardStyle}>
      {tier.highlight ? (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: MONO,
            fontSize: '9.5px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#fff',
            background: COLORS.accent,
            padding: '5px 14px',
            borderRadius: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 18px rgba(61,90,254,0.45)',
          }}
        >
          {t('Most chosen')}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '10.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#959AA2',
          }}
        >
          {tier.name}
        </span>
        {tier.sideTag ? (
          <span
            style={{
              fontFamily: MONO,
              fontSize: '9.5px',
              color: COLORS.green,
              border: '1px solid rgba(24,182,99,0.4)',
              padding: '3px 9px',
              borderRadius: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {tier.sideTag}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '20px 0 3px' }}>
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: tier.highlight ? '64px' : '46px',
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: COLORS.ink,
          }}
        >
          {tier.price}
        </span>
        <span style={{ color: '#959AA2', fontSize: '14px', whiteSpace: 'nowrap' }}>{tier.per}</span>
      </div>
      <div style={{ fontSize: '13px', color: '#959AA2', marginBottom: '22px', minHeight: '20px' }}>{tier.note}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '26px', flex: '1 1 0%' }}>
        {tier.feats.map((feat) => (
          <div
            key={feat}
            style={{ display: 'flex', gap: '11px', alignItems: 'baseline', fontSize: '13.5px', color: '#B6B6C0' }}
          >
            <span aria-hidden style={{ color: tier.tick, flexShrink: 0, fontSize: '12px' }}>
              ◆
            </span>
            {feat}
          </div>
        ))}
      </div>

      <PlanCta tier={tier} />
    </div>
  )
}

type PricingElProps = {
  monthly: AcademyPlan
  yearly: AcademyPlan
}

export function PricingEl({ monthly, yearly }: PricingElProps) {
  const t = useT()
  const tiers = buildTiers(monthly, yearly, t)

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%), radial-gradient(60% 50% at 88% 8%, rgba(61,90,254,0.06) 0%, transparent 60%) #0B0B0E',
        color: COLORS.ink,
        fontFamily: '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px) clamp(36px, 5vw, 56px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: '11.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: COLORS.accentInk,
          }}
        >
          {t('Simple, honest pricing')}
        </div>
        <h1
          style={{
            margin: '18px auto 0',
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: 'clamp(34px, 4.6vw, 60px)',
            lineHeight: 1.02,
            letterSpacing: '-0.026em',
            maxWidth: '20ch',
            textWrap: 'balance',
          }}
        >
          {t('You’re not buying hours of video. You’re buying')}{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 500, color: COLORS.accentInk }}>
            {t('a body of work.')}
          </em>
        </h1>
        <p style={{ margin: '20px auto 0', color: COLORS.softMuted, fontSize: '16.5px', maxWidth: '54ch' }}>
          {t(
            'Every plan includes everything — all 23 courses as they ship, every lab and proof, spaced recall, leagues, and verifiable certificates. Pick the commitment, not the features.',
          )}
        </p>
      </header>

      {/* Plans */}
      <section
        id="plans"
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '12px clamp(20px, 4vw, 48px) clamp(24px, 3vw, 40px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '18px',
            alignItems: 'stretch',
          }}
        >
          {tiers.map((tier) => (
            <PlanCard key={tier.key} tier={tier} />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px 22px',
            marginTop: '26px',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: '10.5px', color: '#959AA2' }}>
            {t('Cancel anytime, no lock-in — and a full lesson is free before you pay.')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'flex' }}>
              <span style={avatarStyle('rgba(61,90,254,0.18)', COLORS.accentInk, 0)}>PN</span>
              <span style={avatarStyle('rgba(24,182,99,0.15)', COLORS.green, -7)}>MW</span>
              <span style={avatarStyle('rgba(224,169,62,0.15)', '#E0A93E', -7)}>DO</span>
              <span style={avatarStyle('#1A1A20', '#959AA2', -7)}>+</span>
            </span>
            <span style={{ fontSize: '12.5px', color: COLORS.softMuted }}>
              {t('Every proof verifiable by code — no invented numbers, ever.')}
            </span>
          </span>
        </div>
      </section>

      {/* Outcomes */}
      <section
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 80px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '10px 32px',
          }}
        >
          {OUTCOMES.map((outcome) => (
            <div key={outcome} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', padding: '8px 0' }}>
              <span aria-hidden style={{ color: COLORS.green, flexShrink: 0 }}>
                ✓
              </span>
              <span style={{ fontSize: '15px', color: '#B6B6C0' }}>{t(outcome)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop: `1px solid ${COLORS.line}`, background: '#0D0D11' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(48px, 7vw, 88px) clamp(20px, 4vw, 48px)' }}>
          <h2
            style={{
              margin: '0 0 32px',
              fontFamily: SERIF,
              fontWeight: 560,
              fontSize: 'clamp(24px, 2.8vw, 34px)',
              letterSpacing: '-0.02em',
            }}
          >
            {t('Honest answers')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ACADEMY_FAQ.map((item) => (
              <div key={item.q} style={{ padding: '22px 0', borderBottom: `1px solid ${COLORS.line}` }}>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: '18px',
                    letterSpacing: '-0.01em',
                    marginBottom: '8px',
                  }}
                >
                  {t(item.q)}
                </div>
                <p style={{ margin: 0, fontSize: '14.5px', color: COLORS.softMuted, maxWidth: '68ch' }}>
                  {t(item.a)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function avatarStyle(bg: string, color: string, marginLeft: number): React.CSSProperties {
  return {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: bg,
    border: '1.5px solid #14141C',
    display: 'grid',
    placeItems: 'center',
    fontFamily: MONO,
    fontSize: '7.5px',
    color,
    marginLeft: marginLeft ? `${marginLeft}px` : undefined,
  }
}

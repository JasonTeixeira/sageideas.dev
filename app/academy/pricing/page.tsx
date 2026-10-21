import type { Metadata } from 'next'
import Link from 'next/link'
import { getAcademyStats } from '@/components/academy/landing/stats'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { ACADEMY_PLANS } from '@/lib/academy/plans'
import { buildCourse, buildFAQPage } from '@/lib/seo/jsonld'
import { getT } from '@/lib/i18n/t'
import { getLocale } from '@/lib/i18n/server'
import { localizedAlternates } from '@/lib/i18n/alternates'

const SITE = 'https://www.sageideas.dev'

/**
 * Public pricing page, implemented 1:1 from
 * "Sage Academy Download/Sage Pricing.dc.html" — section order, markup, inline
 * styles, copy ('en' strings), and hero artwork (localized to /art/academy)
 * match the design file.
 *
 * Honesty deltas (intentional departures, per the no-fake-green rule):
 * - Prices come from ACADEMY_PLANS ($25/mo, $250/yr), not the mock's
 *   $29/$250; the annual note is recomputed (≈ $21/month · billed yearly).
 * - The mock's Team tier showed an invented $190/seat price with no Stripe
 *   backing — shown as "Custom" with the same feature list and contact CTA.
 * - The mock's social-proof line ("12,480 engineers · 2,847 proofs shipped
 *   this week") and fake member avatars are replaced with real catalog counts.
 * - The "Most chosen" badge is replaced with the factual "Best value" badge
 *   from ACADEMY_PLANS; the fabricated "Most members switch to annual…"
 *   behavioral claim is trimmed from the FAQ.
 * - "all 23 courses" in the hero sub uses the real course count.
 * - The Interview Mastery add-on row is an addition (the design has no
 *   add-on slot), styled in the design's gold accent.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('Pricing · Sage Academy'),
    description: t(
      'Simple, honest pricing. Every plan includes everything — every course as it ships, every lab and proof, spaced recall, leagues, and verifiable certificates. Pick the commitment, not the features.',
    ),
    alternates: localizedAlternates('/academy/pricing', locale),
  }
}

const ACCENT = '#3D5AFE'
const GREEN = '#18B663'
const AMBER = '#E0A93E'
const INK = '#F2EFE9'
const LINE = '#1E1E24'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

type Tier = {
  name: string
  tag: string
  sideTag: string
  price: string
  per: string
  note: string
  feats: string[]
  cta: string
  href: string
  highlight: boolean
  border: string
  bg: string
  shadow: string
  tick: string
  priceSize: number
  ctaInk: string
  ctaBg: string
  ctaBorder: string
  ctaShadow: string
}

const baseTier = {
  tag: '',
  sideTag: '',
  highlight: false,
  border: LINE,
  bg: '#111115',
  shadow: 'none',
  tick: '#4A4A54',
  priceSize: 46,
  ctaInk: INK,
  ctaBg: 'transparent',
  ctaBorder: '#2A2A33',
  ctaShadow: 'none',
}

const TIERS: Tier[] = [
  {
    ...baseTier,
    name: 'Monthly',
    price: ACADEMY_PLANS.monthly.price,
    per: '/ month',
    note: 'for trying the water',
    feats: [
      'Everything in the academy',
      'Cancel any month, keep your ledger',
      'Upgrade to annual anytime — prorated',
    ],
    cta: 'Start monthly',
    href: '/academy/signup',
  },
  {
    ...baseTier,
    name: 'Annual',
    highlight: true,
    tag: ACADEMY_PLANS.yearly.badge ?? 'Best value',
    sideTag: 'save 2 months',
    price: ACADEMY_PLANS.yearly.price,
    per: '/ year',
    note: '≈ $21/month · billed yearly',
    feats: [
      'Everything in the academy',
      'Two months free vs monthly',
      'Yearly portfolio review checkpoint',
      'Price locked as new courses ship',
    ],
    cta: 'Start with Engineering Judgment',
    href: '/academy/signup',
    border: 'rgba(61,90,254,0.5)',
    bg: 'linear-gradient(170deg, #14141C, #111115)',
    shadow: '0 0 40px rgba(61,90,254,0.14), 0 32px 80px -32px rgba(0,0,0,0.85)',
    tick: '#8FA0FF',
    priceSize: 64,
    ctaInk: '#fff',
    ctaBg: ACCENT,
    ctaBorder: ACCENT,
    ctaShadow: '0 0 24px rgba(61,90,254,0.4)',
  },
  {
    ...baseTier,
    name: 'Team',
    price: 'Custom',
    per: '',
    note: 'per seat / year · 5+ seats',
    feats: [
      'Everything, for every engineer',
      'Manager view of team evidence ledgers',
      'Cohort onboarding sprint',
      'Invoice billing + seat management',
    ],
    cta: 'Talk to us',
    href: 'mailto:hello@sageideas.dev',
    tick: GREEN,
  },
]

const OUTCOMES = [
  'Real, resume-ready builds you ship and keep — new ones every month',
  'A portfolio of decision memos and passing proofs',
  'Retention that holds under pressure — recall at 1/3/7/30 days',
  'Honest mastery scores a reviewer would agree with',
  'Certificates verifiable by code, not screenshots',
]

const FAQS = [
  {
    q: 'Is this for beginners?',
    a: 'Course 00 assumes you can code a little and think a lot. Career-switchers start there plus Programming Fundamentals; working engineers can enter any live track. Nothing here is watch-and-nod content — expect to be wrong in public and fix it.',
  },
  {
    q: 'Monthly or annual?',
    a: 'Monthly is for trying the water — same access, cancel any month. Annual is two months cheaper and adds a yearly portfolio review. The upgrade is prorated.',
  },
  {
    q: 'Why is the score capped instead of averaged?',
    a: "Because that's how a reviewer reads your work. They don't average your strong claims against your broken one — they stop at the broken one. The cap shows the exact repair that lifts it, so the honest number is also an actionable one.",
  },
  {
    q: 'How much time does it take?',
    a: 'A lesson is 20–40 minutes and ends in a proof. Recall is about six minutes a day. One sprint a week is the intended cadence — this is designed around a job, not instead of one.',
  },
]

export default async function AcademyPricingPage() {
  const t = await getT()
  const { coursesCount, lessonsCount } = await getAcademyStats()

  const pricingLd = [
    buildCourse({
      name: 'Sage Academy membership',
      description:
        'One membership, every course as it ships — interactive lessons, in-browser labs, spaced-recall mastery loops, leagues, and certificates verifiable by code.',
      url: `${SITE}/academy/pricing`,
      priceCents: ACADEMY_PLANS.monthly.amountCents,
      cadence: 'monthly',
      workload: 'PT30M',
    }),
    buildFAQPage(FAQS.map((f) => ({ question: f.q, answer: f.a }))),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingLd) }} />
      <AcademyNav />
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0E',
          backgroundImage:
            'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%), radial-gradient(60% 50% at 88% 8%, rgba(61,90,254,0.06) 0%, transparent 60%)',
          color: INK,
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 16,
          lineHeight: 1.6,
          overflowX: 'clip',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
@media (max-width: 1100px) { #pricing-hero-art, #pricing-hero-art2 { display: none; } }
.spTier { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1); }
.spTier:hover { transform: translateY(-4px); }
.spCta { transition: transform 0.15s ease, opacity 0.15s ease; }
.spCta:hover { transform: translateY(-1px); opacity: 0.92; }
a:focus-visible { outline: 2px solid #8FA0FF; outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`,
          }}
        />

        {/* ============ HERO ============ */}
        <header
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px) clamp(36px, 5vw, 56px)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          { }
          <img
            id="pricing-hero-art"
            src="/art/academy/pricing-hero-right.webp"
            alt=""
            width={1376}
            height={768}
            style={{
              position: 'absolute',
              right: -40,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 'min(30%, 340px)',
              height: 'auto',
              opacity: 0.55,
              pointerEvents: 'none',
              WebkitMaskImage: 'radial-gradient(70% 68% at 50% 50%, #000 25%, transparent 80%)',
              maskImage: 'radial-gradient(70% 68% at 50% 50%, #000 25%, transparent 80%)',
            }}
          />
          { }
          <img
            id="pricing-hero-art2"
            src="/art/academy/pricing-hero-left.webp"
            alt=""
            width={1376}
            height={768}
            style={{
              position: 'absolute',
              left: -60,
              top: '50%',
              transform: 'translateY(-50%) scaleX(-1)',
              width: 'min(30%, 340px)',
              height: 'auto',
              opacity: 0.4,
              pointerEvents: 'none',
              WebkitMaskImage: 'radial-gradient(70% 68% at 50% 50%, #000 25%, transparent 80%)',
              maskImage: 'radial-gradient(70% 68% at 50% 50%, #000 25%, transparent 80%)',
            }}
          />
          <div style={{ ...mono, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>
            {t('Simple, honest pricing')}
          </div>
          <h1
            style={{
              ...serif,
              margin: '18px auto 0',
              fontWeight: 600,
              fontSize: 'clamp(34px, 4.6vw, 60px)',
              lineHeight: 1.02,
              letterSpacing: '-0.026em',
              maxWidth: '20ch',
              textWrap: 'balance',
            }}
          >
            {t('You’re not buying hours of video. You’re buying')}{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#8FA0FF' }}>{t('a body of work.')}</em>
          </h1>
          <p style={{ margin: '20px auto 0', color: '#9C9CA6', fontSize: 16.5, maxWidth: '56ch', textWrap: 'pretty' }}>
            {t('Every plan includes everything — every course as it ships, the full Labs workshop of buildable projects (new ones every month), every proof, spaced recall, leagues, and verifiable certificates. Pick the commitment, not the features.')}
          </p>
        </header>

        {/* ============ TIERS ============ */}
        <section
          id="plans"
          style={{ maxWidth: 1180, margin: '0 auto', padding: '12px clamp(20px, 4vw, 48px) clamp(24px, 3vw, 40px)' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 18,
              alignItems: 'stretch',
            }}
          >
            {TIERS.map((p) => (
              <div
                key={p.name}
                className="spTier"
                style={{
                  position: 'relative',
                  border: `1px solid ${p.border}`,
                  borderRadius: 18,
                  background: p.bg,
                  padding: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: p.shadow,
                }}
              >
                {p.highlight && (
                  <div
                    style={{
                      ...mono,
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 9.5,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: ACCENT,
                      padding: '5px 14px',
                      borderRadius: 12,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 18px rgba(61,90,254,0.45)',
                    }}
                  >
                    {t(p.tag)}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2' }}>
                    {t(p.name)}
                  </span>
                  {p.sideTag && (
                    <span
                      style={{
                        ...mono,
                        fontSize: 9.5,
                        color: GREEN,
                        border: '1px solid rgba(24,182,99,0.4)',
                        padding: '3px 9px',
                        borderRadius: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t(p.sideTag)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '20px 0 3px' }}>
                  <span style={{ ...serif, fontWeight: 600, fontSize: p.priceSize, letterSpacing: '-0.035em', lineHeight: 1 }}>
                    {p.price}
                  </span>
                  {p.per && <span style={{ color: '#9598A2', fontSize: 14, whiteSpace: 'nowrap' }}>{t(p.per)}</span>}
                </div>
                <div style={{ fontSize: 13, color: '#9598A2', marginBottom: 22, minHeight: 20 }}>{t(p.note)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26, flex: 1 }}>
                  {p.feats.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 11, alignItems: 'baseline', fontSize: 13.5, color: '#B6B6C0' }}>
                      <span style={{ color: p.tick, flexShrink: 0, fontSize: 12 }}>◆</span>
                      {t(f)}
                    </div>
                  ))}
                </div>
                <a
                  href={p.href}
                  className="spCta"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    color: p.ctaInk,
                    background: p.ctaBg,
                    border: `1px solid ${p.ctaBorder}`,
                    textDecoration: 'none',
                    fontSize: 14.5,
                    fontWeight: 600,
                    padding: '14px 22px',
                    borderRadius: 26,
                    whiteSpace: 'nowrap',
                    boxShadow: p.ctaShadow,
                  }}
                >
                  {t(p.cta)}
                </a>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px 22px',
              marginTop: 26,
            }}
          >
            <span style={{ ...mono, fontSize: 11, color: INK, border: `1px solid rgba(61,90,254,0.4)`, background: 'rgba(61,90,254,0.08)', borderRadius: 999, padding: '6px 14px' }}>
              ✦ {t('Every plan starts with a')}{' '}
              <b style={{ color: '#8FA0FF' }}>{t('7-day free trial')}</b>{' '}
              {t('— cancel anytime, we remind you first.')}
            </span>
            <span style={{ ...mono, fontSize: 10.5, color: '#9598A2' }}>
              {t('Cancel anytime, no lock-in — access runs to the end of the period you paid for.')}{' '}
              <Link href="/academy/guarantee" style={{ color: '#8FA0FF', textDecoration: 'none' }}>
                {t('billing & cancellation, in plain language')} →
              </Link>
            </span>
            <span style={{ fontSize: 12.5, color: '#9C9CA6' }}>
              {coursesCount} {t('courses')} · {lessonsCount} {t('lessons — every proof verifiable by code')}
            </span>
            <span style={{ ...mono, fontSize: 10.5, color: '#9598A2' }}>
              {t('No paid testimonials.')}{' '}
              <Link href="/academy/how-we-audit" style={{ color: '#8FA0FF', textDecoration: 'none' }}>
                {t('see how we audit our own courses')} →
              </Link>
            </span>
          </div>

          {/* Interview Mastery add-on — addition, not in the design file */}
          <a
            href="/interview"
            className="spCta"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px 18px',
              marginTop: 26,
              padding: '18px 24px',
              border: '1px solid rgba(224,169,62,0.4)',
              borderRadius: 18,
              background: 'rgba(224,169,62,0.05)',
              textDecoration: 'none',
              color: INK,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <span style={{ color: AMBER, fontSize: 12, flexShrink: 0 }}>◆</span>
              <span>
                <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: AMBER }}>
                  {t('Add-on · Interview Mastery')}
                </span>
                <span style={{ display: 'block', fontSize: 13.5, color: '#B6B6C0', marginTop: 3 }}>
                  {t('Mock interviews with an AI interviewer who calls your bluffs — add it to any plan.')}
                </span>
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
              <span style={{ ...serif, fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em' }}>+$39</span>
              <span style={{ fontSize: 13, color: '#9598A2' }}>
                {t('/ month ·')} $24/mo {t('on annual')}
              </span>
              <span style={{ ...mono, fontSize: 10.5, color: AMBER }}>{t('Learn more')} →</span>
            </span>
          </a>
        </section>

        {/* ============ OUTCOMES ============ */}
        <section
          style={{
            maxWidth: 860,
            margin: '0 auto',
            padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 80px)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '10px 32px' }}>
            {OUTCOMES.map((o) => (
              <div key={o} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 0' }}>
                <span style={{ color: GREEN, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 15, color: '#B6B6C0' }}>{t(o)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ HONEST ANSWERS ============ */}
        <section style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(48px, 7vw, 88px) clamp(20px, 4vw, 48px)' }}>
            <h2
              style={{
                ...serif,
                margin: '0 0 32px',
                fontWeight: 560,
                fontSize: 'clamp(24px, 2.8vw, 34px)',
                letterSpacing: '-0.02em',
              }}
            >
              {t('Honest answers')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {FAQS.map((f) => (
                <div key={f.q} style={{ padding: '22px 0', borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ ...serif, fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em', marginBottom: 8 }}>
                    {t(f.q)}
                  </div>
                  <p style={{ margin: 0, fontSize: 14.5, color: '#9C9CA6', maxWidth: '68ch', textWrap: 'pretty' }}>{t(f.a)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <AcademyFooter />
    </>
  )
}

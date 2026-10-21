/**
 * Academy site chrome — nav + footer implemented exactly from
 * "Sage Academy Download/Sage Home.dc.html" (nav markup) and the
 * <sage-footer> widget in "Sage Academy Download/sage-widgets.js".
 * This is the ONLY chrome on the academy marketing surfaces — the studio
 * MarketingChrome must never wrap these pages.
 *
 * Honesty deltas vs the mock: the footer's "62 notes and counting" counter
 * is dropped (invented number); the Monday-note form posts to the real
 * /api/newsletter/subscribe endpoint instead of localStorage.
 */

import Link from 'next/link'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { getLocale } from '@/lib/i18n/server'
import { localizeHref } from '@/lib/i18n/href'
import { getT } from '@/lib/i18n/t'
import { SageChat, FunnelTelemetry } from './SageChat'
import { SageMark } from '../brand/SageMark'
import { NewsletterSignup } from './NewsletterSignup'

const INK = '#F2EFE9'
const DIM = '#B6B6C0'
const MUTED = '#9598A2'
const FAINT = '#9598A2'
const LINE = '#1E1E24'
const BLUE = '#3D5AFE'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const

const NAV_LINKS = [
  { href: '/academy/method', label: 'The method' },
  { href: '/academy/catalog', label: 'Courses' },
  { href: '/academy/labs', label: 'Labs' },
  { href: '/academy/proof-not-paper', label: 'Why proof' },
  // Gold sub-brand: the Interview Mastery add-on gets its accent in the nav.
  { href: '/interview', label: 'Interview', tint: '#E0A93E' },
  { href: '/academy/pricing', label: 'Pricing' },
  { href: '/login?audience=academy', label: 'Log in' },
] as { href: string; label: string; tint?: string }[]

export async function AcademyNav() {
  const [locale, t] = await Promise.all([getLocale(), getT()])
  return (
    <nav
      aria-label="Academy navigation"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: '0 clamp(20px, 4vw, 48px)',
        height: 68,
        background: 'rgba(11,11,14,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <Link href={localizeHref('/', locale)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
        <SageMark size={26} radius={8} />
        <span>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, color: INK }}>
            Sage Academy
          </span>
          <span style={{ ...mono, display: 'block', fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: MUTED }}>
            {t('Judgment · proven')}
          </span>
        </span>
      </Link>
      <div className="acadNavLinks" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {NAV_LINKS.map((l) => (
          <Link
            key={l.label}
            href={localizeHref(l.href, locale)}
            className="acadNavLink"
            style={{
              color: l.tint ? '#C9A96A' : DIM,
              ['--academy-nav-hover' as string]: l.tint ?? INK,
              textDecoration: 'none',
              fontSize: 14,
              padding: '12px 13px',
              borderRadius: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {t(l.label)}
          </Link>
        ))}
        <Link
          href={localizeHref('/academy/signup', locale)}
          className="acadNavCta"
          style={{
            marginLeft: 12,
            color: '#fff',
            background: BLUE,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
            padding: '11px 20px',
            borderRadius: 24,
            whiteSpace: 'nowrap',
            boxShadow: '0 0 22px rgba(61,90,254,0.3)',
          }}
        >
          {t('Start learning')}
        </Link>
        <LanguageSwitcher className="acadLangSwitch" />
      </div>
      {/* nav-squeeze, from the design helmet CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (hover: hover) {
  .acadNavLink:hover { color: var(--academy-nav-hover) !important; background: rgba(255,255,255,0.04) !important; }
  .acadNavCta:hover { background: #6E83FF !important; }
}
@media (max-width: 1120px) { .acadNavLinks a { padding: 12px 8px; font-size: 13px; } }
@media (max-width: 760px) { .acadNavLinks a { display: none; } .acadNavLinks a:last-child { display: inline-flex; } }`,
        }}
      />
    </nav>
  )
}

const FOOTER_COLS: { head: string; links: { href: string; label: string }[] }[] = [
  {
    head: 'Learn',
    links: [
      { href: '/academy/starter', label: 'Free starter path' },
      { href: '/academy/map', label: 'The map' },
      { href: '/academy/method', label: 'The method' },
      { href: '/academy/projects', label: 'What you ship' },
      { href: '/academy/try', label: 'Try a lesson' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/academy/catalog', label: 'Courses' },
      { href: '/field-notes', label: 'Field notes' },
      { href: '/academy/challenge', label: 'Weekly challenge' },
    ],
  },
  {
    head: 'Product',
    links: [
      { href: '/academy/proof-not-paper', label: 'Why proof' },
      { href: '/academy/pricing', label: 'Pricing' },
      { href: '/interview', label: 'Interview Mastery' },
      { href: '/academy/how-we-audit', label: 'How we audit' },
      { href: '/academy/onboarding', label: 'Get started' },
      { href: '/academy/help', label: 'Help center' },
    ],
  },
  {
    head: 'Company',
    links: [
      { href: '/academy/about', label: 'About' },
      { href: '/services', label: 'Hire the studio' },
      { href: 'https://agency.sageideas.dev', label: 'The agency ↗' },
      { href: '/academy/legal', label: 'Legal' },
      { href: 'mailto:hello@sageideas.dev', label: 'hello@sageideas.dev' },
    ],
  },
]

export async function AcademyFooter() {
  const [locale, t] = await Promise.all([getLocale(), getT()])

  return (
    <footer style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11', fontFamily: 'var(--font-sans), sans-serif' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(44px, 6vw, 72px) clamp(20px, 4vw, 48px) 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '36px 28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: INK, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              <SageMark size={26} radius={8} />
              Sage Academy
            </div>
            <div style={{ ...mono, marginTop: 14, fontSize: 10.5, color: MUTED, lineHeight: 1.8 }}>
              frame → route → map
              <br />→ decide → <b style={{ color: '#8FA0FF', fontWeight: 500 }}>prove</b>
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.head}>
              <h2 style={{ ...mono, margin: '0 0 14px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: FAINT }}>
                {t(col.head)}
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith('mailto:') || l.href.startsWith('http') ? (
                      <a
                        href={l.href}
                        {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        style={{ color: '#9C9CA6', textDecoration: 'none', fontSize: 13.5 }}
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={localizeHref(l.href, locale)} style={{ color: '#9C9CA6', textDecoration: 'none', fontSize: 13.5 }}>
                        {t(l.label)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 style={{ ...mono, margin: '0 0 14px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: FAINT }}>
              {t('The Monday note')}
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9C9CA6', lineHeight: 1.55 }}>
              {t('One real incident, mapped in public — in your inbox every Monday.')}
            </p>
            <NewsletterSignup
              emailLabel={t('Email for the Monday note')}
              subscribeLabel={t('Subscribe')}
              successLabel={t("you're in — see you Monday")}
              invalidEmailLabel={t('Enter a valid email address.')}
              failureLabel={t('Subscription failed. Please try again.')}
              unsubscribeLabel={t('unsubscribe anytime')}
            />
          </div>
        </div>
        <div
          style={{
            ...mono,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 'clamp(36px, 5vw, 56px)',
            paddingTop: 22,
            borderTop: `1px solid ${LINE}`,
            fontSize: 10.5,
            color: FAINT,
          }}
        >
          <span style={{ color: MUTED }}>© 2026 Sage Ideas LLC · sageideas.dev</span>
          <span>{t('proof, not vibes')}</span>
        </div>
      </div>
      {/* Sprout chat dock + funnel telemetry ride with the footer so every
          academy marketing page gets both with zero extra wiring. */}
      <SageChat />
      <FunnelTelemetry />
    </footer>
  )
}

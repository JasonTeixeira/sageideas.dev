import { LocaleLink as Link } from '@/components/i18n/locale-link'
import {
  ArrowUpRight,
  Github,
  Linkedin,
  Mail,
  RadioTower,
  Route,
  ShieldCheck,
} from 'lucide-react'
import { SageLivingMark } from '@/components/brand/sage-living-mark'
import { WhatsAppIcon } from '@/components/brand/whatsapp-icon'
import { getLocale } from '@/lib/i18n/server'
import { getMessages, translate } from '@/lib/i18n/messages'

type T = (source: string) => string

type FooterLink = {
  href: string
  label: string
  note?: string
  external?: boolean
}

type FooterColumn = {
  title: string
  links: FooterLink[]
}

const footerColumns: FooterColumn[] = [
  {
    title: 'Engage',
    links: [
      { href: '/services', label: 'Services', note: 'fixed-scope builds' },
      { href: '/pricing', label: 'Pricing', note: 'tiers + retainers' },
      { href: '/book', label: 'Book a call', note: 'start here' },
      { href: '/contact', label: 'Contact', note: 'direct line' },
    ],
  },
  {
    title: 'Proof',
    links: [
      { href: '/work', label: 'Work', note: 'case studies' },
      { href: '/lab', label: 'Lab', note: 'owned products' },
      { href: '/trust', label: 'Trust center', note: 'security + process' },
      { href: '/engineering-os', label: 'Engineering OS', note: 'how it ships' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { href: '/academy', label: 'Academy', note: 'courses forming' },
      { href: '/blog', label: 'Journal', note: 'build notes' },
      { href: '/topics', label: 'Topic hubs', note: 'SEO library' },
      { href: '/tools/route-finder', label: 'Route finder', note: 'diagnostic' },
      { href: '/tools/seo-audit', label: 'SEO audit', note: 'free tool' },
    ],
  },
  {
    title: 'Studio',
    links: [
      { href: '/founder', label: 'Founder', note: 'operator profile' },
      { href: '/studio', label: 'Studio', note: 'how this works' },
      { href: '/industries', label: 'Industries', note: 'vertical routes' },
      { href: '/compare', label: 'Compare', note: 'buying paths' },
    ],
  },
]

const legalLinks: FooterLink[] = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/msa', label: 'MSA' },
  { href: '/legal/nda', label: 'NDA' },
  { href: '/legal/sow-template', label: 'SOW' },
]

const socialLinks: FooterLink[] = [
  { href: 'mailto:sage@sageideas.dev', label: 'Email', external: true },
  { href: 'https://linkedin.com/in/jason-teixeira', label: 'LinkedIn', external: true },
  {
    href: 'https://whatsapp.com/channel/0029Vb8pc2qFcow9BCta6o47',
    label: 'WhatsApp',
    external: true,
  },
  { href: 'https://github.com/JasonTeixeira', label: 'GitHub', external: true },
]

const socialIcons = {
  Email: Mail,
  LinkedIn: Linkedin,
  WhatsApp: WhatsAppIcon,
  GitHub: Github,
}

function FooterLinkItem({ item, t }: { item: FooterLink; t: T }) {
  const externalProps = item.external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : undefined

  return (
    <Link
      href={item.href}
      {...externalProps}
      className="group flex min-h-[42px] items-center justify-between gap-4 rounded-[6px] border border-transparent px-2.5 py-2 transition-colors duration-150 hover:border-[rgba(61,90,254,0.32)] hover:bg-[rgba(61,90,254,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.62)]"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[var(--sage-ink-muted)] transition-colors group-hover:text-[var(--sage-ink)]">
          {t(item.label)}
        </span>
        {item.note ? (
          <span className="mt-0.5 block truncate text-[11px] text-[var(--sage-ink-faint)]">
            {t(item.note)}
          </span>
        ) : null}
      </span>
      <ArrowUpRight
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-[var(--sage-ink-faint)] transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--sage-accent-readable)]"
      />
    </Link>
  )
}

function FooterColumn({ column, t }: { column: FooterColumn; t: T }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="h-px flex-1 bg-[linear-gradient(90deg,rgba(61,90,254,0.72),rgba(124,58,237,0.28),transparent)]"
        />
        <h2 className="[font-family:var(--font-mono),ui-monospace,monospace] text-[10px] uppercase tracking-[0.22em] text-[var(--sage-ink-faint)]">
          {t(column.title)}
        </h2>
      </div>
      <ul className="space-y-1">
        {column.links.map((item) => (
          <li key={item.href}>
            <FooterLinkItem item={item} t={t} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function Footer() {
  const year = new Date().getFullYear()
  const locale = await getLocale()
  const messages = getMessages(locale)
  const t: T = (source) => translate(messages, source)

  return (
    <footer
      className="relative overflow-hidden border-t border-[var(--sage-border)] bg-[#0B0B0E] text-[var(--sage-ink)]"
      aria-label="Site footer"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(242,239,233,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,233,0.028) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(61,90,254,0.9),rgba(124,58,237,0.62),rgba(255,45,155,0.52),transparent)]"
      />

      <div className="relative mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.55fr)]">
          <section className="relative overflow-hidden rounded-[8px] border border-[var(--sage-border-strong)] bg-[rgba(20,20,24,0.72)] p-6 sm:p-8">
            <div
              aria-hidden
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(242,239,233,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,233,0.032) 1px, transparent 1px)',
                backgroundSize: '42px 42px',
              }}
            />
            <div className="relative">
              <Link
                href="/"
                className="group inline-flex items-center gap-3"
                aria-label="Sage Ideas home"
              >
                <SageLivingMark size="lg" />
                <span className="[font-family:var(--font-mono),ui-monospace,monospace] text-[13px] uppercase tracking-[0.18em] text-[var(--sage-ink)] transition-colors group-hover:text-[var(--sage-accent-readable)]">
                  Sage Ideas
                </span>
              </Link>

              <p className="mt-8 max-w-[12ch] text-[clamp(2.45rem,1.55rem_+_3vw,4.9rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-[var(--sage-ink)] [font-family:var(--font-display),var(--font-sans),sans-serif]">
                {t('Build the system.')}
              </p>
              <p className="mt-6 max-w-[42ch] text-base leading-7 text-[var(--sage-ink-muted)]">
                {t(
                  'A solo AI-native studio for product, brand, automation, and growth. Real shipped systems, honest proof, and a direct path to the operator.',
                )}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  { icon: Route, label: 'Route', value: 'Audit -> build' },
                  { icon: RadioTower, label: 'Signal', value: 'Content -> lead' },
                  { icon: ShieldCheck, label: 'Proof', value: 'Public receipts' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="rounded-[6px] border border-[var(--sage-border)] bg-[#0B0B0E]/70 p-3"
                    >
                      <Icon
                        aria-hidden
                        className="mb-3 h-4 w-4 text-[var(--sage-accent-readable)]"
                      />
                      <p className="[font-family:var(--font-mono),ui-monospace,monospace] text-[9px] uppercase tracking-[0.18em] text-[var(--sage-ink-faint)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-[var(--sage-ink-muted)]">
                        {item.value}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[var(--sage-accent)] px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.72)] [font-family:var(--font-mono),ui-monospace,monospace]"
                >
                  ./book
                </Link>
                <Link
                  href="/work"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[var(--sage-border-strong)] px-5 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--sage-ink-muted)] transition-colors hover:border-[rgba(61,90,254,0.46)] hover:text-[var(--sage-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.62)] [font-family:var(--font-mono),ui-monospace,monospace]"
                >
                  {t('View work')}
                </Link>
              </div>
            </div>
          </section>

          <div className="rounded-[8px] border border-[var(--sage-border)] bg-[rgba(20,20,24,0.52)] p-4 sm:p-6">
            <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
              {footerColumns.map((column) => (
                <FooterColumn key={column.title} column={column} t={t} />
              ))}
            </div>
            <div className="mt-8 grid gap-3 border-t border-[var(--sage-border)] pt-5 md:grid-cols-[1fr_auto_auto] md:items-center">
              <p className="[font-family:var(--font-mono),ui-monospace,monospace] text-[11px] uppercase tracking-[0.16em] text-[var(--sage-ink-faint)]">
                {t('Not sure where to route the build?')}
              </p>
              <Link
                href="/tools/seo-audit"
                className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[var(--sage-border)] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--sage-ink-muted)] transition-colors hover:border-[rgba(61,90,254,0.46)] hover:text-[var(--sage-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.62)] [font-family:var(--font-mono),ui-monospace,monospace]"
              >
                {t('Run audit')}
              </Link>
              <Link
                href="/book"
                className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[var(--sage-accent)] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.72)] [font-family:var(--font-mono),ui-monospace,monospace]"
              >
                {t('Book call')}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-[var(--sage-border)] pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="[font-family:var(--font-mono),ui-monospace,monospace] text-[11px] uppercase tracking-[0.14em] text-[var(--sage-ink-faint)]">
              © {year} Sage Ideas LLC · Orlando, FL
            </p>
            <nav aria-label="Social links" className="flex items-center gap-2">
              {socialLinks.map((item) => {
                const Icon = socialIcons[item.label as keyof typeof socialIcons]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external && item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.external && item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    aria-label={item.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sage-border)] bg-[rgba(20,20,24,0.72)] text-[var(--sage-ink-faint)] transition-colors hover:border-[rgba(61,90,254,0.52)] hover:text-[var(--sage-accent-readable)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(61,90,254,0.62)]"
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                  </Link>
                )
              })}
            </nav>
          </div>

          <nav aria-label="Legal links">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center [font-family:var(--font-mono),ui-monospace,monospace] text-[11px] uppercase tracking-[0.12em] text-[var(--sage-ink-faint)] transition-colors hover:text-[var(--sage-ink-muted)]"
                  >
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}

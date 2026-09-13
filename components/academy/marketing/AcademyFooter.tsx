import Link from 'next/link'

const MONO = '"JetBrains Mono", monospace'

type FooterLink = {
  label: string
  href: string
  external?: boolean
}

// Real routes only — verified to exist. No Legal/Terms/Privacy (deferred).
const LINKS: FooterLink[] = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Why proof', href: '/academy/proof-not-paper' },
  { label: 'Proof, not paper', href: '/academy/proof-not-paper' },
  { label: 'Help', href: '/academy/help' },
  { label: 'Contact', href: 'mailto:contact@sageideas.dev' },
  {
    label: 'WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029VbDfypZCcW4xCLb8h331',
    external: true,
  },
]

type AcademyFooterProps = {
  tagline?: string
}

export function AcademyFooter({
  tagline = 'learn by building · proof over paper',
}: AcademyFooterProps) {
  return (
    <>
      {/* Focus-visible ring for footer nav links. Inline styles cannot
          express :focus-visible; this scoped rule satisfies SC 2.4.11. */}
      <style>{`
        footer nav[aria-label="Academy footer"] a:focus-visible {
          outline: 2px solid #3D5AFE;
          outline-offset: 3px;
          border-radius: 4px;
        }
      `}</style>
      <footer style={{ borderTop: '1px solid #1E1E24' }}>
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '30px clamp(20px, 4vw, 48px)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#9598A2' }}>
          Sage Academy · {tagline}
        </span>

        <nav
          aria-label="Academy footer"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'clamp(12px, 2vw, 22px)',
          }}
        >
          {LINKS.map(({ label, href, external }) => (
            <Link
              key={href}
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: '#9598A2',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <span style={{ fontFamily: MONO, fontSize: 11, color: '#4A4A54' }}>
          © 2026 Sage Ideas LLC
        </span>
      </div>
    </footer>
    </>
  )
}

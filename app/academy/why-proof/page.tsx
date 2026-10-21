import type { Metadata } from 'next'
import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'

const MONO = 'var(--font-mono), monospace'
const DISPLAY = 'var(--font-serif), Georgia, serif'

// Real routes verified in-repo:
// - Course 00 "Engineering Judgment" → /academy/course/[slug] with the seed slug
//   'career-engineering_judgment_foundation' (GATE_COURSE_SLUG in
//   components/academy/path/PathDomainSection.tsx + course00 seed scripts).
//   The mock's CTA copy names this exact course, so it links there rather than
//   the generic course-landing mapping.
// - "See the loop" → the mock links to Sage How It Works → /how-it-works.
const COURSE_00_HREF = '/academy/course/career-engineering_judgment_foundation'
const HOW_IT_WORKS_HREF = '/how-it-works'

export const metadata: Metadata = {
  title: 'Why proof · Sage Academy',
  description:
    'Prove it — no vibes. Certificates claim; they don’t show. A reviewer trusts a claim they can follow to an artifact. So the thing you leave with is an evidence ledger a skeptic can audit.',
}

const PROSE_STYLE = {
  margin: '28px 0 0',
  fontSize: 17.5,
  lineHeight: 1.75,
  color: '#B6B6C0',
  textWrap: 'pretty' as const,
}

const QUOTE_TEXT_STYLE = {
  fontFamily: DISPLAY,
  fontStyle: 'italic' as const,
  fontWeight: 500,
  fontSize: 'clamp(24px, 2.8vw, 32px)',
  lineHeight: 1.25,
  letterSpacing: '-0.012em',
  color: '#F2EFE9',
}

type ClaimRow = {
  claim: string
  artifact: string
  border: boolean
}

const CLAIM_ROWS: ClaimRow[] = [
  {
    claim: 'Can bound a change before shipping it',
    artifact: 'blast-radius.svg',
    border: true,
  },
  {
    claim: 'Repaired a duplicate-charge incident end to end',
    artifact: 'postmortem-07.md',
    border: false,
  },
]

const CLAIM_GRID = '1.3fr 1fr auto'

export default function WhyProofPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0B0E',
        backgroundImage:
          'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%)',
        color: '#F2EFE9',
        fontFamily: 'var(--font-sans), sans-serif',
        fontSize: 16,
        lineHeight: 1.6,
        overflowX: 'clip',
      }}
    >
      {/* Page-scoped rules from the mock: focus ring, hero-art breakpoint,
          the DISPROVEN stamp entrance, and reduced-motion safety. */}
      <style>{`
        main a:focus-visible {
          outline: 2px solid #8FA0FF;
          outline-offset: 2px;
          border-radius: 4px;
        }
        @keyframes stampIn {
          0% { opacity: 0; transform: rotate(-2deg) scale(2.4); }
          60% { opacity: 1; transform: rotate(-2deg) scale(0.92); }
          100% { opacity: 1; transform: rotate(-2deg) scale(1); }
        }
        #stamp-disproven {
          animation: stampIn 0.5s cubic-bezier(0.2, 1.2, 0.4, 1) 0.35s both;
        }
        @media (max-width: 1180px) { #proof-hero-art { display: none; } }
        @media (prefers-reduced-motion: reduce) {
          #stamp-disproven { animation-duration: 0.01ms; }
        }
      `}</style>

      {/* Nav */}
      <AcademyNav />

      {/* Manifesto */}
      <main>
      <article
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding:
            'clamp(64px, 9vw, 128px) clamp(20px, 4vw, 48px) clamp(64px, 9vw, 110px)',
          position: 'relative',
        }}
      >
        { }
        <img
          id="proof-hero-art"
          src="/art/academy/manifesto-art.webp"
          alt=""
          style={{
            position: 'absolute',
            right: -390,
            top: 40,
            width: 460,
            opacity: 0.65,
            pointerEvents: 'none',
            WebkitMaskImage:
              'radial-gradient(72% 72% at 50% 50%, #000 30%, transparent 82%)',
            maskImage:
              'radial-gradient(72% 72% at 50% 50%, #000 30%, transparent 82%)',
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: '#8FA0FF',
          }}
        >
          The manifesto
        </div>
        <h1
          style={{
            margin: '20px 0 0',
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 'clamp(48px, 7.5vw, 104px)',
            lineHeight: 0.96,
            letterSpacing: '-0.032em',
            textWrap: 'balance',
          }}
        >
          Prove it —{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#18B663' }}>
            no vibes.
          </em>
        </h1>

        <p style={{ ...PROSE_STYLE, marginTop: 48 }}>
          Every engineer has sat in the war room. The dashboard is red, the
          customer is charged twice, and somebody says — with total confidence —
          &ldquo;it can&apos;t be the retry logic.&rdquo; Nobody can say why.
          That sentence is a vibe wearing a badge.
        </p>

        {/* Decorative mockup: war-room reenactment (illustrative, not live data) */}
        <figure
          aria-label="Illustration: a war-room claim being disproven"
          style={{
            margin: '28px 0 0',
            border: '1px solid #1E1E24',
            borderRadius: 16,
            background: '#111115',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: '1px solid #1E1E24',
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#E5484D',
              }}
            >
              The war room · a reenactment
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A4A54' }}>
              03:12 UTC · sev-1
            </span>
          </div>
          <div
            style={{
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                border: '1px solid #2A2A33',
                borderRadius: '14px 14px 14px 4px',
                padding: '12px 16px',
                fontSize: 14.5,
                color: '#B6B6C0',
              }}
            >
              &ldquo;It can&apos;t be the retry logic. We tested that path last
              quarter.&rdquo;
            </div>
            <div
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginLeft: 4,
              }}
            >
              <span
                id="stamp-disproven"
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  padding: '4px 10px',
                  borderRadius: 5,
                  color: '#E5484D',
                  border: '1px solid rgba(229,72,77,0.45)',
                  background: 'rgba(229,72,77,0.07)',
                  transform: 'rotate(-2deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                DISPROVEN
              </span>
              <span
                style={{ fontSize: 12.5, color: '#9598A2', fontStyle: 'italic' }}
              >
                It was the retry logic.
              </span>
              {/* Conversion beat at the emotional peak: the stamp just landed. */}
              <Link
                href="/academy/engine"
                style={{
                  marginLeft: 'auto',
                  fontFamily: MONO,
                  fontSize: 11,
                  color: '#18B663',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(24,182,99,0.4)',
                  paddingBottom: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                run a check like this yourself →
              </Link>
            </div>
          </div>
        </figure>

        <p style={PROSE_STYLE}>
          Certificates of completion are the same sentence in PDF form. They
          claim; they don&apos;t show. A reviewer, an interviewer, a staff
          engineer — none of them trust a claim they can&apos;t follow to an
          artifact. And they&apos;re right not to.
        </p>

        <blockquote
          style={{
            margin: '40px 0',
            padding: '8px 0 8px 28px',
            borderLeft: '2px solid #3D5AFE',
          }}
        >
          <span style={QUOTE_TEXT_STYLE}>
            A map you can defend the edges of is worth more than a diagram of
            everything.
          </span>
        </blockquote>

        {/* Decorative mockup: bag-of-boxes vs decision-map (illustrative) */}
        <figure
          aria-label="Illustration: an undefended box diagram versus a defensible decision map"
          style={{
            margin: '0 0 28px',
            position: 'relative',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 1,
            background: '#2A2A33',
            border: '1px solid #1E1E24',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{ background: '#111115', padding: 24 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#E0A93E',
                marginBottom: 14,
              }}
            >
              ▲ A bag of boxes
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                opacity: 0.65,
                marginBottom: 14,
              }}
            >
              {['API', 'DB', 'CDN?', '…'].map((box) => (
                <span
                  key={box}
                  style={{
                    border: '1px solid #2A2A33',
                    borderRadius: 6,
                    padding: '6px 11px',
                    fontSize: 12,
                    color: '#9598A2',
                  }}
                >
                  {box}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: '#9C9CA6' }}>
              &ldquo;CDN?&rdquo; — an edge nobody can defend.
            </div>
          </div>
          <div style={{ background: '#111115', padding: 24 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#18B663',
                marginBottom: 14,
              }}
            >
              ✓ A decision map
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  border: '1.5px solid #8FA0FF',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(61,90,254,0.08)',
                }}
              >
                checkout
              </span>
              <span style={{ color: '#4A4A54' }}>→</span>
              <span
                style={{
                  border: '1.5px solid #E0A93E',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(224,169,62,0.08)',
                }}
              >
                retry
              </span>
              <span style={{ color: '#4A4A54' }}>→</span>
              <span
                style={{
                  border: '1.5px solid #18B663',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: 'rgba(24,182,99,0.08)',
                }}
              >
                ledger
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#B6B6C0' }}>
              Every edge has a direction. Every omission has a written defense.
            </div>
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#0B0B0E',
              border: '1px solid #2A2A33',
              display: 'grid',
              placeItems: 'center',
              fontFamily: DISPLAY,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#9598A2',
              zIndex: 2,
            }}
          >
            vs
          </div>
        </figure>

        <p style={{ ...PROSE_STYLE, marginTop: 0 }}>
          That&apos;s why the center of gravity here is the defended omission.
          You don&apos;t get credit for boxes — you get credit for the edges you
          drew, the edges you deliberately left out, and the sentence that
          defends each one. And your score is honest about it:
        </p>

        {/* Decorative mockup: illustrative mastery meter (example figure, not a real stat) */}
        <figure
          aria-label="Illustration: an example mastery meter capped at the weakest proof"
          style={{
            margin: '28px 0',
            border: '1px solid #1E1E24',
            borderRadius: 16,
            background: '#111115',
            padding: 26,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: MONO,
              fontSize: 10.5,
              color: '#9598A2',
              marginBottom: 10,
            }}
          >
            <span>MASTERY · Course 00 · example</span>
            <span>
              <span style={{ color: '#E0A93E' }}>78</span> / 100
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              height: 9,
              borderRadius: 5,
              background: '#1A1A20',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '78%',
                borderRadius: 5,
                background: 'linear-gradient(90deg, #3D5AFE, #6E83FF)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '78%',
                top: -5,
                bottom: -5,
                width: 2,
                background: '#E0A93E',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '0 9% 0 78%',
                background:
                  'repeating-linear-gradient(45deg, rgba(224,169,62,0.18) 0, rgba(224,169,62,0.18) 4px, transparent 4px, transparent 8px)',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 12,
              fontSize: 13,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: '#9598A2' }}>
              The ceiling is your weakest proof — because that&apos;s where a
              skeptic stops reading.
            </span>
            <span style={{ color: '#18B663', fontWeight: 600 }}>
              repair lesson 10 → lifts to 91
            </span>
          </div>
        </figure>

        <p style={{ ...PROSE_STYLE, marginTop: 0 }}>
          The same standard runs through everything. Your lab starter fails
          until you do the real skill. When something breaks, the repair is the
          curriculum — a postmortem you can show beats a completion streak you
          can&apos;t.
        </p>

        <blockquote
          style={{
            margin: '40px 0',
            padding: '8px 0 8px 28px',
            borderLeft: '2px solid #18B663',
          }}
        >
          <span style={QUOTE_TEXT_STYLE}>
            Pick any claim. Follow the artifact. See for yourself.
          </span>
        </blockquote>

        {/* Decorative mockup: claim → artifact → verdict (illustrative example rows) */}
        <figure
          aria-label="Illustration: example claims traced to artifacts"
          style={{
            margin: '0 0 28px',
            border: '1px solid #1E1E24',
            borderRadius: 16,
            background: '#111115',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: CLAIM_GRID,
              gap: 14,
              padding: '11px 22px',
              borderBottom: '1px solid #1E1E24',
              fontFamily: MONO,
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#4A4A54',
            }}
          >
            <span>Claim</span>
            <span>Artifact</span>
            <span>Verdict</span>
          </div>
          {CLAIM_ROWS.map((row) => (
            <div
              key={row.artifact}
              style={{
                display: 'grid',
                gridTemplateColumns: CLAIM_GRID,
                gap: 14,
                alignItems: 'center',
                padding: '14px 22px',
                borderBottom: row.border ? '1px solid #1E1E24' : 'none',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                {row.claim}
              </span>
              <span
                style={{ fontFamily: MONO, fontSize: 10.5, color: '#8FA0FF' }}
              >
                {row.artifact}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  padding: '4px 9px',
                  borderRadius: 5,
                  color: '#18B663',
                  border: '1px solid rgba(24,182,99,0.4)',
                  background: 'rgba(24,182,99,0.07)',
                  whiteSpace: 'nowrap',
                }}
              >
                PASSED
              </span>
            </div>
          ))}
        </figure>

        <p style={{ ...PROSE_STYLE, marginTop: 0 }}>
          So the thing you leave with is not a certificate — it&apos;s an
          evidence ledger a skeptic can audit, and a set of instincts that hold
          under pressure. That&apos;s the whole bet: judgment can be taught, if
          every lesson ends in something you can be wrong about in public — and
          then fix.
        </p>

        {/* Closing CTAs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginTop: 52,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href={COURSE_00_HREF}
            style={{
              display: 'inline-flex',
              color: '#fff',
              background: '#3D5AFE',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 600,
              padding: '15px 28px',
              borderRadius: 26,
              boxShadow: '0 0 24px rgba(61,90,254,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            Start with Engineering Judgment
          </Link>
          <Link
            href={HOW_IT_WORKS_HREF}
            style={{
              display: 'inline-flex',
              color: '#F2EFE9',
              border: '1px solid #2A2A33',
              textDecoration: 'none',
              fontSize: 15,
              padding: '14px 28px',
              borderRadius: 26,
              whiteSpace: 'nowrap',
            }}
          >
            See the loop
          </Link>
        </div>
      </article>
      </main>

      <AcademyFooter />
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllFieldNotes } from '@/lib/field-notes'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { FieldNotesList } from './field-notes-list'
import { estimateReadMin, formatDate, routeFor, tintFor, type FieldNoteRow } from './note-meta'

/**
 * Field notes index, implemented 1:1 from
 * "Sage Academy Download/Sage Field Notes.dc.html" — hero, featured note,
 * filters, list rows, and the Monday-note subscribe strip.
 *
 * Honesty deltas: the mock's invented "62 and counting / 62 notes" counters
 * are replaced with the real published count; the mock's ten sample notes are
 * replaced by the real notes from content/field-notes (loader preserved); the
 * subscribe box posts to the real newsletter endpoint.
 */

const MONO = 'var(--font-mono), monospace'
const SERIF = 'var(--font-serif), Georgia, serif'

export const metadata: Metadata = {
  title: 'Field Notes — Sage Academy',
  description:
    'Real engineering incidents, mapped in public — free. Every note teaches one decision: stake, map, verdict.',
}

export default function FieldNotesPage() {
  const notes = getAllFieldNotes()
  const featured = notes[0]
  const rows: FieldNoteRow[] = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    category: n.category,
    dateLabel: formatDate(n.date),
    readMin: estimateReadMin(n.body),
    route: routeFor(n.category),
    tint: tintFor(n.category),
  }))

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
      <style>{`
        .fn-featured { transition: border-color 0.22s, transform 0.22s cubic-bezier(0.16,1,0.3,1); }
        .fn-featured:hover { border-color: rgba(61,90,254,0.75) !important; transform: translateY(-2px); }
        .fn-row:hover { background: #141418 !important; }
        .fn-chip:hover { border-color: #343440 !important; color: #F2EFE9 !important; }
        @media (max-width: 760px) { #fn-hero-art { display: none; } }
      `}</style>

      <AcademyNav />

      {/* HERO */}
      <header
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(48px, 7vw, 88px) clamp(20px, 4vw, 48px) 28px',
          position: 'relative',
        }}
      >
        { }
        <img
          id="fn-hero-art"
          src="/art/academy/notes-hero.webp"
          alt=""
          style={{
            position: 'absolute',
            right: -20,
            top: '46%',
            transform: 'translateY(-50%)',
            width: 'min(42%, 440px)',
            opacity: 0.7,
            pointerEvents: 'none',
            WebkitMaskImage: 'radial-gradient(70% 68% at 52% 48%, #000 28%, transparent 80%)',
            maskImage: 'radial-gradient(70% 68% at 52% 48%, #000 28%, transparent 80%)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: '#8FA0FF',
            }}
          >
            Field notes · {notes.length} and counting · the front door
          </div>
          <h1
            style={{
              margin: '14px 0 0',
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: 'clamp(34px, 4.4vw, 56px)',
              lineHeight: 1.02,
              letterSpacing: '-0.026em',
              maxWidth: '20ch',
              textWrap: 'balance',
            }}
          >
            Real incidents, mapped in public —{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#8FA0FF' }}>free.</em>
          </h1>
          <p
            style={{
              margin: '16px 0 0',
              color: '#9C9CA6',
              maxWidth: '58ch',
              fontSize: 16,
              textWrap: 'pretty',
            }}
          >
            Every note teaches one decision the way the academy does — stake, map, verdict. When a note hooks you,
            it routes you into the exact course sprint that trains the skill.
          </p>
        </div>
      </header>

      {/* FEATURED NOTE */}
      {featured && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '8px clamp(20px, 4vw, 48px) 0' }}>
          <Link
            href={`/field-notes/${featured.slug}`}
            className="fn-featured"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              border: '1px solid rgba(61,90,254,0.35)',
              borderRadius: 16,
              background: 'linear-gradient(115deg, #10131F 0%, #111115 65%)',
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: tintFor(featured.category),
                    textTransform: 'uppercase',
                  }}
                >
                  {featured.category}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: '#8FA0FF' }}>
                  LATEST · THE MONDAY NOTE
                </span>
              </span>
              <span
                style={{
                  fontFamily: SERIF,
                  fontWeight: 600,
                  fontSize: 'clamp(24px, 2.6vw, 32px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.12,
                }}
              >
                {featured.title}
              </span>
              <span style={{ fontSize: 14.5, color: '#9C9CA6', textWrap: 'pretty' }}>{featured.summary}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#9598A2' }}>
                  {formatDate(featured.date)} · {estimateReadMin(featured.body)} min · routes →{' '}
                  {routeFor(featured.category)}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#8FA0FF' }}>Read the note →</span>
              </span>
            </div>
            <div style={{ position: 'relative', minHeight: 210 }}>
              { }
              <img
                src="/art/academy/note-featured.webp"
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 30%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, #000 30%)',
                }}
              />
            </div>
          </Link>
        </section>
      )}

      {/* FILTERS + LIST + MONDAY NOTE */}
      <FieldNotesList notes={rows} />

      <AcademyFooter />
    </div>
  )
}

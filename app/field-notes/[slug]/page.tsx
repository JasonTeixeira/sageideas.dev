import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllFieldNotes, getFieldNoteBySlug } from '@/lib/field-notes'
import { renderMarkdownToHtml } from '@/lib/blogMarkdown'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { estimateReadMin, routeFor, tintFor } from '../note-meta'
import { ShareNote } from './share-note'
import styles from './field-note.module.css'

/**
 * Field-note article, implemented 1:1 from
 * "Sage Academy Download/Sage Field Note Article.dc.html" — hero art, kicker,
 * byline, body typography, the sprint-routing block, and "Keep reading".
 * The body is the real note markdown (loader preserved); the design's compact
 * back-link nav is replaced by the shared AcademyNav, with the
 * "← all field notes" link moved to the top of the article.
 */

const MONO = 'var(--font-mono), monospace'
const SERIF = 'var(--font-serif), Georgia, serif'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllFieldNotes().map((n) => ({ slug: n.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const note = getFieldNoteBySlug(slug)
  if (!note) return { title: 'Field note not found' }
  return {
    title: `${note.title} — Field Notes`,
    description: note.summary,
  }
}

function formatDateUpper(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.toUpperCase()
  return d
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

export default async function FieldNotePage({ params }: PageProps) {
  const { slug } = await params
  const note = getFieldNoteBySlug(slug)
  if (!note) notFound()

  const tint = tintFor(note.category)
  const route = routeFor(note.category)
  const readMin = estimateReadMin(note.body)

  // Strip a leading H1 if present — the page renders the title in the header.
  const cleanedMd = note.body.replace(/^\s*#\s+.+\n+/, '')
  const html = await renderMarkdownToHtml(cleanedMd)

  // Sibling notes for the "Keep reading" block.
  const others = getAllFieldNotes()
    .filter((n) => n.slug !== note.slug)
    .slice(0, 2)

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
        lineHeight: 1.65,
        overflowX: 'clip',
      }}
    >
      <style>{`
        @media (max-width: 1180px) { #note-hero-art { display: none; } }
        .fn-keep:hover { color: #F2EFE9 !important; background: rgba(255,255,255,0.03); }
        .fn-cta:hover { background: #6E83FF !important; }
        .fn-cta-alt:hover { color: #B9C4FF !important; }
      `}</style>

      <AcademyNav />

      <article
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: 'clamp(48px, 7vw, 80px) clamp(20px, 4vw, 48px) clamp(56px, 8vw, 96px)',
          position: 'relative',
        }}
      >
        { }
        <img
          id="note-hero-art"
          src="/art/academy/note-article.webp"
          alt=""
          style={{
            position: 'absolute',
            right: -400,
            top: 30,
            width: 440,
            opacity: 0.5,
            pointerEvents: 'none',
            WebkitMaskImage: 'radial-gradient(72% 72% at 50% 50%, #000 28%, transparent 80%)',
            maskImage: 'radial-gradient(72% 72% at 50% 50%, #000 28%, transparent 80%)',
          }}
        />

        {/* Back link (the design's compact nav carries this; here it lives above the kicker) */}
        <Link
          href="/field-notes"
          style={{
            display: 'inline-block',
            marginBottom: 22,
            fontFamily: MONO,
            fontSize: 11,
            color: '#9598A2',
            textDecoration: 'none',
          }}
        >
          ← all field notes
        </Link>

        {/* Kicker */}
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: tint }}>
          {note.category.toUpperCase()} · {formatDateUpper(note.date)} · {readMin} MIN
        </div>
        <h1
          style={{
            margin: '16px 0 0',
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: 'clamp(32px, 4.4vw, 50px)',
            lineHeight: 1.04,
            letterSpacing: '-0.026em',
            textWrap: 'balance',
          }}
        >
          {note.title}
        </h1>

        {/* Byline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 22,
            paddingBottom: 26,
            borderBottom: '1px solid #1E1E24',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(61,90,254,0.14)',
              border: '1px solid rgba(61,90,254,0.4)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: MONO,
              fontSize: 10,
              color: '#8FA0FF',
            }}
          >
            JT
          </span>
          <span style={{ fontSize: 13.5, color: '#B6B6C0' }}>Jason Teixeira</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#4A4A54' }}>· founder, Sage Academy</span>
          <span style={{ marginLeft: 'auto' }}>
            <ShareNote title={note.title} />
          </span>
        </div>

        {/* Body */}
        <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />

        {/* SPRINT ROUTING BLOCK */}
        <div
          style={{
            margin: '38px 0 0',
            border: '1px solid rgba(61,90,254,0.45)',
            borderRadius: 16,
            background: 'linear-gradient(165deg, #14141C, #111115)',
            padding: 26,
            boxShadow: '0 0 32px rgba(61,90,254,0.1)',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#8FA0FF',
              marginBottom: 10,
            }}
          >
            This note routes to a sprint
          </div>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 21, letterSpacing: '-0.015em' }}>
            {route}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: '#9C9CA6', maxWidth: '58ch', textWrap: 'pretty' }}>
            Reading about this repair took {readMin} minutes. Doing it — with the failing lab, the eval gate, and a
            proof in your ledger — takes one sprint. That&apos;s the difference between knowing and being trusted
            with it.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
            <Link
              href="/academy/catalog"
              className="fn-cta"
              style={{
                display: 'inline-flex',
                color: '#fff',
                background: '#3D5AFE',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                padding: '12px 24px',
                borderRadius: 24,
                whiteSpace: 'nowrap',
                boxShadow: '0 0 20px rgba(61,90,254,0.35)',
              }}
            >
              Train this skill →
            </Link>
            <Link
              href="/academy/preview"
              className="fn-cta-alt"
              style={{ fontFamily: MONO, fontSize: 11, color: '#8FA0FF', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              or try a lesson free — no account
            </Link>
          </div>
        </div>

        {/* RELATED */}
        {others.length > 0 && (
          <div style={{ marginTop: 36, borderTop: '1px solid #1E1E24', paddingTop: 24 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#9598A2',
                marginBottom: 14,
              }}
            >
              Keep reading
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/field-notes/${o.slug}`}
                  className="fn-keep"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '11px 4px',
                    textDecoration: 'none',
                    color: '#B6B6C0',
                    fontSize: 14.5,
                    borderRadius: 8,
                  }}
                >
                  <span>{o.title}</span>
                  <span style={{ color: '#4A4A54' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <AcademyFooter />
    </div>
  )
}

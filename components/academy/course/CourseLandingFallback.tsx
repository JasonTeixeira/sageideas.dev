import Link from 'next/link'
import conceptsManifest from '@/lib/academy/concepts-manifest.json'
import { getAcademyRegistryCourse } from '@/lib/academy/registry'

/**
 * Public course landing rendered from the git-resident concepts manifest when
 * the catalog service is unreachable. Honest degraded state: only real
 * authored lessons (each links to its public concept preview), no invented
 * counts, and a clear signup CTA. Never fabricates catalog data.
 */

type ManifestCourse = {
  slug: string
  title: string
  description: string
  trackSlug: string
}
type ManifestConcept = {
  slug: string
  title: string
  question: string
  courseSlug: string
  durationMin: number
}

export function getFallbackCourse(slug: string): ManifestCourse | null {
  const registryCourse = getAcademyRegistryCourse(slug)
  if (!registryCourse || registryCourse.fallbackVisibility !== 'public')
    return null
  const preview = (conceptsManifest.courses as ManifestCourse[]).find(
    (course) => course.slug === registryCourse.slug,
  )
  if (!preview) return null
  return {
    ...preview,
    slug: registryCourse.slug,
    title: registryCourse.title,
    trackSlug: registryCourse.topic,
  }
}

const mono = { fontFamily: 'var(--font-mono), monospace' } as const

export function CourseLandingFallback({ course }: { course: ManifestCourse }) {
  const lessons = (conceptsManifest.concepts as ManifestConcept[]).filter(
    (c) => c.courseSlug === course.slug,
  )
  const totalMin = lessons.reduce((sum, l) => sum + l.durationMin, 0)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0B0E',
        backgroundImage:
          'radial-gradient(110% 70% at 50% -8%, rgba(143,160,255,0.07) 0%, transparent 55%)',
        color: '#F2EFE9',
        fontFamily: 'var(--font-sans), sans-serif',
      }}
    >
      <main
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 72px) clamp(16px, 3vw, 32px) 80px',
        }}
      >
        <div
          style={{
            ...mono,
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#8FA0FF',
          }}
        >
          Sage Academy course · {lessons.length} lessons · ~
          {Math.round(totalMin / 60)}h
        </div>
        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontWeight: 600,
            fontSize: 'clamp(32px, 4.4vw, 52px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            maxWidth: '22ch',
          }}
        >
          {course.title}
        </h1>
        <p
          style={{
            margin: '18px 0 0',
            color: '#9C9CA6',
            fontSize: 17,
            maxWidth: '58ch',
          }}
        >
          {course.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 28,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/academy/signup"
            style={{
              display: 'inline-flex',
              color: '#0B0B0E',
              background: '#8FA0FF',
              textDecoration: 'none',
              fontSize: 14.5,
              fontWeight: 700,
              padding: '13px 26px',
              borderRadius: 24,
              whiteSpace: 'nowrap',
            }}
          >
            Start this course
          </Link>
          <Link
            href="/academy/engine"
            style={{
              ...mono,
              fontSize: 11,
              color: '#9598A2',
              textDecoration: 'none',
            }}
          >
            try a live lesson first →
          </Link>
        </div>

        <div style={{ marginTop: 44 }}>
          <div
            style={{
              ...mono,
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#6B6B76',
              marginBottom: 12,
            }}
          >
            Every lesson, previewable
          </div>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {lessons.map((l, i) => (
              <li key={l.slug}>
                <Link
                  href={`/academy/concepts/${l.slug}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 14,
                    alignItems: 'baseline',
                    border: '1px solid #1E1E24',
                    borderRadius: 12,
                    background: '#111115',
                    padding: '14px 18px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ ...mono, fontSize: 12, color: '#8FA0FF' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <b style={{ fontSize: 15, fontWeight: 600 }}>{l.title}</b>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        fontSize: 13,
                        color: '#9C9CA6',
                      }}
                    >
                      {l.question}
                    </span>
                  </span>
                  <span style={{ ...mono, fontSize: 11, color: '#6B6B76' }}>
                    {l.durationMin}m
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <p style={{ ...mono, marginTop: 28, fontSize: 11, color: '#6B6B76' }}>
          $20/mo membership unlocks every course ·{' '}
          <Link href="/academy" style={{ color: '#9598A2' }}>
            see the full academy →
          </Link>
        </p>
      </main>
    </div>
  )
}

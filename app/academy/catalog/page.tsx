import type { Metadata } from 'next'
import Link from 'next/link'
import { getT } from '@/lib/i18n/t'
import { getLocale } from '@/lib/i18n/server'
import { localizedAlternates } from '@/lib/i18n/alternates'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { getAcademyStats } from '@/components/academy/landing/stats'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
import { getAcademyRegistryCourse } from '@/lib/academy/registry'
import type { TopicKey } from '@/lib/academy/topics'
import { CatalogGrid, type CatalogCard, type TrackKey } from './CatalogGrid'
import { SkipToContent } from '@/components/skip-to-content'

/**
 * The public course catalog, implemented 1:1 from
 * "Sage Academy Download/Sage Courses.dc.html" — section order (hero →
 * featured Course 00 → filter + grid → CTA), markup, inline styles, copy,
 * and artwork (localized to /art/academy) match the design file.
 *
 * Real data-wiring: headline counts come from getAcademyStats() (live
 * Supabase, honest taxonomy fallback when the DB is unreachable — it can only
 * under-claim). Cards whose courses exist in the DB link to their real
 * /academy/course/<slug> routes; the DB's published courses are merged into
 * the grid so it grows as courses ship. Design-only courses render exactly as
 * the design marks them (live / in production) and route to /academy/signup.
 *
 * Honesty deltas: the mock's hardcoded "23 courses · 448 lessons" kicker uses
 * real counts instead, and the invented per-card enrollment counts ("3.1k
 * enrolled") are omitted. Everything else is the design, verbatim.
 */

const ACCENT = '#3D5AFE'
const LINE = '#1E1E24'
const INK = '#F2EFE9'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

// Real routes verified in-repo (same mapping the landing page uses):
const COURSE_00_SLUG = getAcademyRegistryCourse(
  'career-engineering_judgment_foundation',
)!.slug
const COURSE_00_HREF = `/academy/course/${COURSE_00_SLUG}`

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('Courses · Sage Academy'),
    description: t(
      'The Sage Academy catalog — every course ends in an artifact a reviewer trusts. Foundations, engineering, data, AI engineering, ship-it, and growth tracks.'
    ),
    alternates: localizedAlternates('/academy/catalog', locale),
  }
}

export const dynamic = 'force-dynamic'

// catalog() from the design file, verbatim (track, name, live flag, meta, outcome).
const DESIGN_CATALOG: {
  slug: string
  t: TrackKey
  name: string
  meta: string
  outcome: string
}[] = [
  // FOUNDATIONS
  {
    slug: 'career-concept_maps_real_world_engineering',
    t: 'foundations',
    name: 'Think Like a Senior Engineer: Concept Maps',
    meta: '30 lessons · 6 modules',
    outcome:
      'Build maps you can defend the edges of — for systems, codebases, and outages.',
  },
  {
    slug: 'career-programming_cs_foundations',
    t: 'foundations',
    name: 'Programming & CS Foundations',
    meta: '20 lessons · 5 modules',
    outcome:
      'The mechanics beneath every language: memory, state, complexity, and honest debugging.',
  },
  {
    slug: 'python-basics',
    t: 'foundations',
    name: 'Python Basics',
    meta: '4 lessons · 1 module',
    outcome: 'Just enough Python to run every lab in the academy.',
  },
  // ENGINEERING
  {
    slug: 'programming-fundamentals',
    t: 'engineering',
    name: 'Programming Fundamentals',
    meta: '18 lessons · 2 modules',
    outcome:
      'Control flow, state, and debugging as a diagnosis discipline — with a debug log artifact.',
  },
  {
    slug: 'career-backend_engineering',
    t: 'engineering',
    name: 'Backend Engineering',
    meta: '20 lessons · 5 modules',
    outcome:
      'APIs, queues, idempotency, and failure repair under real load. Ends in a production API.',
  },
  {
    slug: 'career-frontend_fullstack',
    t: 'engineering',
    name: 'Frontend & Fullstack Product Engineering',
    meta: '20 lessons · 5 modules',
    outcome:
      'Product surfaces with real data flow, accessibility, and request-path judgment.',
  },
  {
    slug: 'career-architecture_system_design',
    t: 'engineering',
    name: 'Architecture & System Design',
    meta: '20 lessons · 5 modules',
    outcome:
      'Tradeoffs, capacity, and written decisions that survive review. Ends in a design packet.',
  },
  {
    slug: 'career-security_identity',
    t: 'engineering',
    name: 'Security & Identity Engineering',
    meta: '20 lessons · 5 modules',
    outcome:
      'Threat modeling, auth, and blast-radius thinking grounded in OWASP.',
  },
  {
    slug: 'career-mobile_engineering_deep_dive',
    t: 'engineering',
    name: 'Mobile Engineering Deep Dive',
    meta: '20 lessons · 5 modules',
    outcome:
      'Native constraints, offline state, and release judgment for mobile surfaces.',
  },
  {
    slug: 'career-qa_sdet_test_automation_engineering',
    t: 'engineering',
    name: 'QA / SDET & Test Automation',
    meta: '20 lessons · 5 modules',
    outcome:
      'Tests as proof design: what to check, what to skip, and how to defend both.',
  },
  {
    slug: 'career-networking_fundamentals_advanced_networking',
    t: 'engineering',
    name: 'Networking Fundamentals & Advanced',
    meta: '20 lessons · 5 modules',
    outcome: 'Packets to policies — diagnose the layer, not the symptom.',
  },
  {
    slug: 'career-ux_ui_product_design_for_engineers',
    t: 'engineering',
    name: 'UX / UI & Product Design for Engineers',
    meta: '20 lessons · 5 modules',
    outcome:
      'Design judgment for people who ship: hierarchy, states, and honest interfaces.',
  },
  // DATA
  {
    slug: 'career-databases_data_modeling',
    t: 'data',
    name: 'Databases & Data Modeling',
    meta: '20 lessons · 5 modules',
    outcome:
      'Schemas that survive review — modeling, constraints, and migration judgment.',
  },
  {
    slug: 'career-data_engineering_analytics',
    t: 'data',
    name: 'Data Engineering & Analytics Platforms',
    meta: '20 lessons · 5 modules',
    outcome:
      'Pipelines, contracts, and the difference between data that moves and data you can trust.',
  },
  // AI
  {
    slug: 'career-ai_engineering_rag_eval',
    t: 'ai',
    name: 'AI Engineering, RAG, Evals, Safety & LLMOps',
    meta: '20 lessons · 5 modules',
    outcome:
      'Retrieval, eval gates, failure repair, and shipping AI systems you can defend.',
  },
  // SHIP-IT
  {
    slug: 'career-cloud_devops_operations',
    t: 'shipit',
    name: 'Cloud, DevOps & Production Operations',
    meta: '20 lessons · 5 modules',
    outcome:
      'Deploys, rollbacks, and runbooks — operations as engineering, not ritual.',
  },
  {
    slug: 'career-observability_reliability_performance',
    t: 'shipit',
    name: 'Observability, Reliability & Performance',
    meta: '20 lessons · 5 modules',
    outcome:
      'See the system before it fails: SLOs, traces, and performance judgment.',
  },
  {
    slug: 'career-platform_engineering_internal_developer_platforms',
    t: 'shipit',
    name: 'Platform Engineering & Internal Dev Platforms',
    meta: '20 lessons · 5 modules',
    outcome:
      'Golden paths and paved roads — build the platform your team actually uses.',
  },
  {
    slug: 'career-enterprise_it_saas_admin_business_systems',
    t: 'shipit',
    name: 'Enterprise IT, SaaS Admin & Business Systems',
    meta: '20 lessons · 5 modules',
    outcome:
      'The systems around the software: identity, procurement, and integration judgment.',
  },
  // GROWTH
  {
    slug: 'career-interview_career_portfolio',
    t: 'growth',
    name: 'Interview, Career & Portfolio',
    meta: '20 lessons · 5 modules',
    outcome:
      'Turn your evidence ledger into offers — interviews as proof presentations.',
  },
  {
    slug: 'career-product_execution_market_feedback',
    t: 'growth',
    name: 'Product Execution & Market Feedback',
    meta: '20 lessons · 5 modules',
    outcome:
      'Ship, measure, decide: product judgment for engineers who own outcomes.',
  },
  {
    slug: 'career-engineering_leadership_staff_execution',
    t: 'growth',
    name: 'Engineering Leadership & Staff-Level Execution',
    meta: '20 lessons · 5 modules',
    outcome:
      'Leverage, writing, and decisions at the level where code stops being the job.',
  },
]

const TRACK_BY_TOPIC: Record<TopicKey, TrackKey> = {
  foundations: 'foundations',
  engineering: 'engineering',
  data: 'data',
  'ai-engineering': 'ai',
  'ship-it': 'shipit',
  growth: 'growth',
}

export default async function CatalogPage() {
  const t = await getT()
  const { coursesCount, lessonsCount, courses } = await getAcademyStats()

  // Start from the design's static list, then wire real DB courses in: known
  // slugs (and exact title matches) turn their design card into a real course
  // link; real courses the design doesn't list are appended to the grid.
  const cards: CatalogCard[] = DESIGN_CATALOG.map((c) => ({
    track: c.t,
    name: c.name,
    outcome: c.outcome,
    meta: c.meta,
    live: false,
    href: null,
  }))
  const liveBySlug = new Map<string, { href: string; lessons: number }>()
  const extras: CatalogCard[] = []
  for (const course of courses) {
    if (course.slug === COURSE_00_SLUG) continue // featured card above the grid
    if (DESIGN_CATALOG.some((entry) => entry.slug === course.slug)) {
      liveBySlug.set(course.slug, {
        href: `/academy/course/${course.slug}`,
        lessons: course.lessons,
      })
    } else {
      extras.push({
        track: TRACK_BY_TOPIC[course.topic] ?? 'engineering',
        name: course.title,
        outcome: course.subtitle ?? '',
        meta: `${course.lessons} lessons`,
        live: true,
        href: `/academy/course/${course.slug}`,
      })
    }
  }
  const merged = cards
    .map((card, index) => {
      const live = liveBySlug.get(DESIGN_CATALOG[index].slug)
      return live
        ? {
            ...card,
            live: true,
            href: live.href,
            meta: `${live.lessons} lessons`,
          }
        : card
    })
    .concat(extras)

  return (
    <>
      <SkipToContent />
      <AcademyNav />
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0E',
          backgroundImage:
            'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%)',
          color: INK,
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 16,
          lineHeight: 1.6,
          overflowX: 'clip',
        }}
      >
        <main id="main-content" tabIndex={-1}>
        {/* ============ HERO ============ */}
        <header
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px) 36px',
            position: 'relative',
          }}
        >
          <img
            src="/art/academy/band-brush.webp"
            alt=""
            style={{
              position: 'absolute',
              right: 0,
              top: '42%',
              transform: 'translateY(-50%)',
              width: 'min(46%, 520px)',
              opacity: 0.85,
              pointerEvents: 'none',
              WebkitMaskImage:
                'radial-gradient(70% 68% at 55% 45%, #000 25%, transparent 78%)',
              maskImage:
                'radial-gradient(70% 68% at 55% 45%, #000 25%, transparent 78%)',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ ...mono, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>
              {t('The catalog ·')} {coursesCount} {t('courses ·')} {lessonsCount} {t('lessons · 6 tracks')}
            </div>
            <h1
              style={{
                ...serif,
                margin: '16px 0 0',
                fontWeight: 600,
                fontSize: 'clamp(34px, 4.2vw, 54px)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                maxWidth: '20ch',
                textWrap: 'balance',
              }}
            >
              {t('Every course ends in')} <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#8FA0FF' }}>{t('an artifact')}</em> {t('a reviewer trusts.')}
            </h1>
          </div>
        </header>

        {/* ============ FEATURED: COURSE 00 ============ */}
        <section
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '0 clamp(20px, 4vw, 48px) 28px',
          }}
        >
          <Link
            href={COURSE_00_HREF}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              border: '1px solid rgba(61,90,254,0.35)',
              borderRadius: 16,
              background: 'linear-gradient(115deg, #10131F 0%, #111115 65%)',
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
              transition:
                'border-color 0.22s, transform 0.22s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#8FA0FF' }}>
                {t('Start here · Course 00')}
              </span>
              <span style={{ ...serif, fontWeight: 600, fontSize: 'clamp(22px, 2.4vw, 28px)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {t('Engineering Judgment & the Sage Learning OS')}
              </span>
              <span style={{ fontSize: 14, color: '#9C9CA6', textWrap: 'pretty' }}>
                {t('The loop every other course runs on: frame → route → map → decide → prove. Turn a messy incident into a decision a reviewer can inspect.')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
                <span style={{ ...mono, fontSize: 10.5, color: '#9598A2' }}>{t('16 lessons · 4 modules · ✓ live')}</span>
                <span style={{ ...mono, fontSize: 11.5, color: '#8FA0FF' }}>{t('Enroll →')}</span>
              </span>
            </div>
            <div style={{ position: 'relative', minHeight: 220 }}>
              <img
                src="/art/academy/featured-judgment.webp"
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, #000 30%)',
                  maskImage:
                    'linear-gradient(to right, transparent 0%, #000 30%)',
                }}
              />
            </div>
          </Link>
        </section>

        {/* ============ FILTER + LIST ============ */}
        <CatalogGrid cards={merged} />

        {/* ============ CTA ============ */}
        <section
          style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}
        >
          <div
            style={{
              maxWidth: 760,
              margin: '0 auto',
              padding:
                'clamp(40px, 6vw, 64px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 80px)',
              textAlign: 'center',
            }}
          >
            <img
              src="/art/academy/loop-brush.webp"
              alt={t('The Sage loop: frame, route, map, decide, prove')}
              style={{
                display: 'block',
                width: 'min(460px, 82%)',
                margin: '0 auto 6px',
                WebkitMaskImage:
                  'radial-gradient(70% 85% at 50% 50%, #000 45%, transparent 96%)',
                maskImage:
                  'radial-gradient(70% 85% at 50% 50%, #000 45%, transparent 96%)',
              }}
            />
            <h2
              style={{
                ...serif,
                margin: '0 auto',
                fontWeight: 600,
                fontSize: 'clamp(26px, 3vw, 38px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: '24ch',
                textWrap: 'balance',
              }}
            >
              {t('Not sure where to start? Course 00 is the operating system.')}
            </h2>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 26,
                flexWrap: 'wrap',
                whiteSpace: 'nowrap',
              }}
            >
              <Link
                href={COURSE_00_HREF}
                style={{
                  display: 'inline-flex',
                  color: '#fff',
                  background: ACCENT,
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '15px 28px',
                  borderRadius: 26,
                  boxShadow: '0 0 24px rgba(61,90,254,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('Start with Engineering Judgment')}
              </Link>
            </div>
          </div>
        </section>

        <EcosystemBand current="catalog" />
        </main>
        <AcademyFooter />
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Rocket,
  Search,
  UserCheck,
} from 'lucide-react'
import { extendedTiersBySlug } from '@/data/services/extended'
import { tiersBySlug, careTiers } from '@/data/services/tiers'
import { CapacitySignal } from '@/components/social-proof/capacity-signal'
import { Hairline, MonoLabel, Surface, CtaLink } from '@/components/el'
import { ConversionMap, MotionProofStrip, SystemHeroPanel } from '@/components/living/LivingPageSystem'

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────

type EngagementType = 'studio' | 'project' | 'consult'

const TYPE_TABS: { value: EngagementType; label: string; tagline: string }[] = [
  { value: 'studio', label: 'Studio Engagement', tagline: 'Embedded for months, not days' },
  { value: 'project', label: 'Project', tagline: 'Scoped delivery with a fixed outcome' },
  { value: 'consult', label: 'Consult', tagline: 'A focused call or short review' },
]

const TIMELINE_OPTS = [
  { value: 'asap', label: 'ASAP, within 2 weeks' },
  { value: '2-4w', label: '2-4 weeks out' },
  { value: '1-2m', label: '1-2 months out' },
  { value: '3m+', label: '3+ months out' },
  { value: 'exploring', label: 'Just exploring' },
]

const BUDGET_OPTS: Record<EngagementType, { value: string; label: string }[]> = {
  studio: [
    { value: '25-50k', label: '$25-50k / month' },
    { value: '50-100k', label: '$50-100k / month' },
    { value: '100k+', label: '$100k+ / month' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
  project: [
    { value: '<10k', label: 'Under $10k' },
    { value: '10-25k', label: '$10-25k' },
    { value: '25-50k', label: '$25-50k' },
    { value: '50-100k', label: '$50-100k' },
    { value: '100k+', label: '$100k+' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
  consult: [
    { value: '<10k', label: 'Under $10k' },
    { value: '10-25k', label: '$10-25k' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
}

const PLACEHOLDERS: Record<EngagementType, string> = {
  studio:
    'What product or platform are you running, what does the team look like, and what would success in the first 90 days look like?',
  project:
    'What needs to ship, what does "done" look like, and what existing systems or constraints matter?',
  consult:
    'What decision are you trying to make, what have you already tried, and what would a useful 30 minutes give you?',
}

function readType(raw: string | null): EngagementType {
  if (raw === 'project' || raw === 'consult') return raw
  return 'studio'
}

function resolveEngagementContext(slug: string | null): {
  type: EngagementType
  prefill: string
  badge?: string
} | null {
  if (!slug) return null
  const ext = extendedTiersBySlug[slug]
  if (ext) {
    const isRetainer = ext.category === 'retainers'
    const isDiagnostic = ext.category === 'diagnostics'
    const isFlagship = ext.category === 'ai-flagship'
    const type: EngagementType = isRetainer ? 'studio' : isDiagnostic ? 'consult' : 'project'
    const prefill = isFlagship
      ? `Interested in: ${ext.name} (${ext.price}, ${ext.timeline}).\n\nMy business / use case: \n\nWhat I want the agent to handle: \n\nTools we already use: \n\nAnything custom or out-of-scope to discuss: `
      : `Interested in: ${ext.name} (${ext.price}). \n\nContext: `
    return { type, badge: ext.name, prefill }
  }
  const prod = tiersBySlug[slug]
  if (prod) {
    return {
      type: 'project',
      badge: prod.name,
      prefill: `Interested in: ${prod.name} (${prod.price}). \n\nContext: `,
    }
  }
  const care = careTiers.find((t) => t.slug === slug)
  if (care) {
    return {
      type: 'studio',
      badge: care.name,
      prefill: `Interested in: ${care.name} (${care.price}/mo). \n\nContext: `,
    }
  }
  if (slug === 'custom' || slug === 'bespoke-build') {
    return {
      type: 'project',
      badge: 'Custom scope',
      prefill: 'Looking for a custom-scoped engagement. \n\nWhat we need: ',
    }
  }
  if (slug === 'studio-package') {
    return {
      type: 'studio',
      badge: 'Studio Package',
      prefill:
        'Interested in the Studio Package (90-day DFY + 6-month retainer, from $45k). \n\nContext: ',
    }
  }
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// EL form primitives
// ────────────────────────────────────────────────────────────────────────────

// Inline so it beats the unlayered global `h1,h2,h3 { font-family: var(--font-display) }`.
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 0",
}

const inputClass =
  'w-full rounded-[3px] border border-[var(--sage-border-strong)] bg-[var(--sage-surface-2)] px-4 py-2.5 text-[13px] text-[var(--sage-ink)] placeholder:text-[var(--sage-ink-faint)] focus:border-[#3D5AFE] focus:outline-none focus:ring-1 focus:ring-[#3D5AFE]/30 transition-colors duration-150'

const selectClass = `${inputClass} appearance-none cursor-pointer pr-10`

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-2 mb-2">
        <MonoLabel tone="muted" className="text-[10px]">
          {label}
        </MonoLabel>
        {required && (
          <MonoLabel tone="accent" className="text-[10px]" aria-hidden="true">
            required
          </MonoLabel>
        )}
      </div>
      {children}
      {hint && (
        <p className="mt-1.5 text-[11px] [font-family:var(--font-mono),ui-monospace,monospace] text-[var(--sage-ink-faint)]">
          {hint}
        </p>
      )}
    </label>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Contact inner (needs useSearchParams → client)
// ────────────────────────────────────────────────────────────────────────────

function ContactInner() {
  const params = useSearchParams()
  const engagementCtx = useMemo(() => resolveEngagementContext(params.get('engagement')), [params])
  const initialType = useMemo(
    () => engagementCtx?.type ?? readType(params.get('type')),
    [engagementCtx, params]
  )
  const initialSource = useMemo(
    () => params.get('source') || (engagementCtx ? `engagement:${params.get('engagement')}` : ''),
    [engagementCtx, params]
  )
  const initialPrefill = useMemo(
    () => engagementCtx?.prefill || params.get('prefill') || '',
    [engagementCtx, params]
  )

  const [engagementType, setEngagementType] = useState<EngagementType>(initialType)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [authority, setAuthority] = useState('')
  const [timeline, setTimeline] = useState('')
  const [budget, setBudget] = useState('')
  const [scope, setScope] = useState(initialPrefill)
  const [honey, setHoney] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setEngagementType(initialType)
  }, [initialType])

  useEffect(() => {
    if (initialPrefill && !scope) setScope(initialPrefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrefill])

  useEffect(() => {
    const allowed = BUDGET_OPTS[engagementType].map((b) => b.value)
    if (budget && !allowed.includes(budget)) setBudget('')
  }, [engagementType, budget])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || name.trim().length < 2) return setError('Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email.')
    if (!scope.trim() || scope.trim().length < 20)
      return setError('Tell us a bit more about scope (20+ characters).')

    setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagement_type: engagementType,
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          role: role.trim(),
          company_size: companySize,
          decision_authority: authority,
          timeline,
          budget_band: budget,
          scope: scope.trim(),
          source: initialSource,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          honey,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Try again or email sage@sageideas.dev.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Network error. Try again or email sage@sageideas.dev.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--sage-bg)] flex items-center">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Accent badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[3px] border border-[#3D5AFE]/30 bg-[#3D5AFE]/[0.06] mb-8">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#3D5AFE]" />
              <MonoLabel tone="accent" className="text-[10px]">Inquiry received</MonoLabel>
            </div>

            <h1 style={SERIF} className="text-4xl sm:text-5xl font-normal text-[var(--sage-ink)] leading-tight tracking-[-0.01em]">
              Got it. Check your inbox.
            </h1>
            <p className="mt-6 text-[15px] text-[var(--sage-ink-muted)] leading-relaxed">
              A confirmation just landed at{' '}
              <span className="text-[var(--sage-ink)] [font-family:var(--font-mono),ui-monospace,monospace]">
                {email}
              </span>
              . Every inquiry is read personally. Well-matched ones get a response within 48 hours.
            </p>
            <p className="mt-3 text-[13px] text-[var(--sage-ink-faint)]">
              No match? You&apos;ll still hear back. We don&apos;t ghost.
            </p>

            <Hairline className="mt-10 mb-8" />

            <div className="flex flex-wrap gap-3">
              <CtaLink href="/work" variant="solid" arrow>
                See recent work
              </CtaLink>
              <CtaLink href="/process" variant="ghost" arrow>
                How engagements run
              </CtaLink>
            </div>
          </motion.div>
        </section>
      </div>
    )
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-[var(--sage-bg)]">

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-end"
        >
          <div className="max-w-3xl">
            {/* Mono eyebrow */}
            <MonoLabel tone="faint" as="p" className="text-[11px] mb-4">
              {'Contact Sage Ideas'}
            </MonoLabel>

            {/* Fraunces display heading */}
            <h1 style={SERIF} className="text-5xl sm:text-6xl lg:text-7xl font-normal text-[var(--sage-ink)] leading-[1.05] tracking-[-0.02em]">
              Tell me what you want built.
            </h1>

            {/* Accent lead hairline */}
            <Hairline accentLead className="mt-6 mb-6" />

            <p className="text-[15px] text-[var(--sage-ink-muted)] leading-relaxed max-w-[52ch]">
              Send the business problem, workflow, or website leak. I will point you to the right demo,
              build path, or next step.
            </p>

            {/* Pre-selected badge */}
            {engagementCtx?.badge && (
              <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-[3px] border border-[#3D5AFE]/30 bg-[#3D5AFE]/[0.06]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3D5AFE]" />
                <MonoLabel tone="accent" className="text-[10px]">
                  Pre-selected: {engagementCtx.badge}
                </MonoLabel>
              </div>
            )}
          </div>
          <SystemHeroPanel
            eyebrow="inquiry router"
            title="Contact decision map"
            nodes={['Need', 'Scope', 'Fit', 'Next']}
            stats={[
              { label: 'reply window', value: '<48h' },
              { label: 'handoff', value: 'none' },
              { label: 'source', value: 'direct' },
            ]}
          />
        </motion.div>
        <div className="mt-12">
          <MotionProofStrip
            items={[
              { label: 'well matched reply', value: '<48h' },
              { label: 'operator', value: 'Jason' },
              { label: 'sales team', value: 'none' },
              { label: 'fit check', value: 'direct' },
            ]}
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <ConversionMap
          steps={[
            { label: 'Studio', detail: 'Use this when you need principal-level product, AI, brand, or growth help over months.' },
            { label: 'Project', detail: 'Use this when there is a fixed outcome: site, app, automation, audit, or system build.' },
            { label: 'Consult', detail: 'Use this when you need a decision, teardown, scope review, or technical second opinion.' },
            { label: 'Wrong fit', detail: 'If the studio is not the right shape, the response will say that clearly.' },
          ]}
        />
      </section>

      {/* ── Capacity signal ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
        <CapacitySignal />
      </section>

      {/* ── Engagement type tabs ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid sm:grid-cols-3 gap-3" role="tablist" aria-label="Engagement type">
          {TYPE_TABS.map((tab) => {
            const active = engagementType === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setEngagementType(tab.value)}
                className={[
                  'text-left rounded-[3px] border p-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE]/50',
                  active
                    ? 'border-[#3D5AFE]/40 bg-[#3D5AFE]/[0.05]'
                    : 'border-[var(--sage-border)] bg-[var(--sage-surface-1)] hover:border-[var(--sage-border-strong)]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className={[
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      active ? 'bg-[#3D5AFE]' : 'bg-[var(--sage-border-strong)]',
                    ].join(' ')}
                    aria-hidden
                  />
                  <MonoLabel tone={active ? 'accent' : 'faint'} className="text-[10px]">
                    {tab.value}
                  </MonoLabel>
                </div>
                <div className="text-[14px] font-medium text-[var(--sage-ink)] mb-1">{tab.label}</div>
                <div className="text-[12px] text-[var(--sage-ink-faint)]">{tab.tagline}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Form + sidebar ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">

          {/* Form surface */}
          <Surface level={2} bordered ticks className="overflow-hidden">
            <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honey}
                onChange={(e) => setHoney(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                    autoComplete="name"
                    required
                    maxLength={120}
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={inputClass}
                    autoComplete="email"
                    required
                    maxLength={200}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Company">
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company"
                    className={inputClass}
                    autoComplete="organization"
                    maxLength={200}
                  />
                </Field>
                <Field label="Role">
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="CTO, Head of Eng, Founder…"
                    className={inputClass}
                    autoComplete="organization-title"
                    maxLength={120}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Company size" hint="Helps me tailor the reply.">
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select size…</option>
                    <option value="solo">Just me / founder</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                  </select>
                </Field>
                <Field label="Your role in this decision">
                  <select
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select…</option>
                    <option value="buyer">I&apos;m the decision-maker</option>
                    <option value="proposing">I&apos;m proposing to leadership</option>
                    <option value="exploring">Exploring for someone else</option>
                  </select>
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Timeline">
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select timeline…</option>
                    {TIMELINE_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Budget band">
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select budget…</option>
                    {BUDGET_OPTS[engagementType].map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Scope" required hint="Be specific. The more detail, the faster the reply.">
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder={PLACEHOLDERS[engagementType]}
                  rows={6}
                  className={`${inputClass} font-sans resize-y min-h-[140px]`}
                  required
                  maxLength={5000}
                />
                <div className="mt-1.5 text-[11px] [font-family:var(--font-mono),ui-monospace,monospace] text-[var(--sage-ink-faint)] tabular-nums">
                  {scope.length} / 5000
                </div>
              </Field>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-[3px] border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Hairline />

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex h-12 items-center gap-2.5 rounded-[3px] bg-[#3D5AFE] px-6 text-[13px] font-medium uppercase tracking-[0.08em] text-white transition-[background-color,box-shadow,transform] duration-200 ease-out [font-family:var(--font-mono),ui-monospace,monospace] hover:bg-[#5670ff] hover:shadow-[0_0_28px_-4px_rgba(61,90,254,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send inquiry
                      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                    </>
                  )}
                </button>
                <p className="text-[12px] [font-family:var(--font-mono),ui-monospace,monospace] text-[var(--sage-ink-faint)]">
                  Well-matched inquiries get a reply within 48 hours.
                </p>
              </div>
            </form>
          </Surface>

          {/* Conversion support panel */}
          <div className="space-y-3">
            <SidebarCard
              icon={Calendar}
              label="Book"
              title="Prefer a call?"
              body="Skip the form and book a 30-minute build call. Bring the problem, not a pitch deck."
              href="/book?source=contact_sidebar"
              cta="Book a call"
            />
            <SidebarCard
              icon={UserCheck}
              label="Founder"
              title="Who you're talking to"
              body="One operator. Twelve years of platform engineering. Read the founder page first if it helps."
              href="/founder"
              cta="Visit founder page"
            />
            {/* Privacy note */}
            <Surface level={1} bordered className="p-5">
              <MonoLabel tone="faint" className="text-[10px] block mb-2">{'// Privacy'}</MonoLabel>
              <p className="text-[13px] text-[var(--sage-ink-faint)] leading-relaxed">
                Your info is handled per our{' '}
                <Link
                  href="/legal/privacy"
                  className="text-[#3D5AFE] hover:text-[var(--sage-ink)] underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
                </Link>
                . We collect only what we need to respond and never sell personal data.
              </p>
            </Surface>
          </div>
        </div>
      </section>

      {/* ── Who + What to expect ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <Hairline className="mb-16" />

        <div className="grid lg:grid-cols-[320px_1fr] gap-12 items-start">

          {/* Face card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
          >
            <Surface level={2} bordered className="overflow-hidden">
              <div className="relative aspect-[4/5] bg-[var(--sage-surface-1)]">
                <Image
                  src="/images/headshot.jpg"
                  alt="Jason Teixeira, founder of Sage Ideas"
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-3">
                <Hairline />
                <MonoLabel tone="faint" className="text-[10px] block">{'// Who replies'}</MonoLabel>
                <div className="text-[15px] font-medium text-[var(--sage-ink)]">Jason Teixeira</div>
                <div className="text-[13px] text-[var(--sage-ink-faint)]">Founder · Sage Ideas Studio</div>
                <p className="text-[13px] text-[var(--sage-ink-faint)] leading-relaxed pt-1">
                  Every inquiry lands in my inbox. No SDR, no triage queue. You will talk to the
                  person doing the work.
                </p>
                <div className="flex items-center gap-3 rounded-[3px] border border-[var(--sage-border)] bg-[var(--sage-surface-1)] p-3 mt-2">
                  <Clock className="h-4 w-4 text-[#3D5AFE] shrink-0" />
                  <div>
                    <MonoLabel tone="faint" className="text-[10px] block">Typical response</MonoLabel>
                    <div className="text-[13px] font-medium text-[var(--sage-ink)] mt-0.5">
                      Within 1 business day
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>

          {/* What to expect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <MonoLabel tone="faint" as="p" className="text-[11px] mb-4">
              {'// what to expect'}
            </MonoLabel>
            <h2 style={SERIF} className="text-3xl sm:text-4xl font-normal text-[var(--sage-ink)] leading-tight tracking-[-0.01em]">
              From inquiry to kickoff,<br />in four steps.
            </h2>
            <p className="mt-4 text-[14px] text-[var(--sage-ink-muted)] leading-relaxed max-w-[52ch]">
              No black-box sales process. Here&apos;s exactly what happens after you submit.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {[
                {
                  icon: MessageSquare,
                  step: '01',
                  title: 'Reply within 1 business day',
                  body: "A real response from me, not an autoresponder. Either we book a call or I tell you it is not a fit.",
                  duration: '< 24h',
                },
                {
                  icon: Search,
                  step: '02',
                  title: 'Build call (30-45 min)',
                  body: "I dig into the actual problem, current state, and what \"done\" looks like. You leave clearer either way.",
                  duration: 'Week 1',
                },
                {
                  icon: CheckCircle2,
                  step: '03',
                  title: 'Written scope + fixed quote',
                  body: "A short written proposal: scope, milestones, price, timeline, and what's explicitly out of scope.",
                  duration: 'Week 1-2',
                },
                {
                  icon: Rocket,
                  step: '04',
                  title: 'Kickoff and first artifact',
                  body: 'On signing, we set up the shared workspace and ship the first deliverable inside the first week.',
                  duration: 'Week 2-3',
                },
              ].map((item) => (
                <Surface
                  key={item.step}
                  level={1}
                  bordered
                  interactive
                  className="p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-[#3D5AFE]/[0.08] rounded-[2px] border border-[#3D5AFE]/20">
                        <item.icon className="h-3.5 w-3.5 text-[#3D5AFE]" />
                      </div>
                      <MonoLabel tone="faint" className="text-[10px]">Step {item.step}</MonoLabel>
                    </div>
                    <MonoLabel tone="accent" className="text-[10px]">{item.duration}</MonoLabel>
                  </div>
                  <div className="text-[14px] font-medium text-[var(--sage-ink)] mb-2">{item.title}</div>
                  <p className="text-[13px] text-[var(--sage-ink-faint)] leading-relaxed">{item.body}</p>
                </Surface>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sidebar card
// ────────────────────────────────────────────────────────────────────────────

function SidebarCard({
  icon: Icon,
  label,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  title: string
  body: string
  href: string
  cta: string
}) {
  return (
    <Surface level={1} bordered className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-[#3D5AFE]/[0.08] rounded-[2px] border border-[#3D5AFE]/20">
          <Icon className="h-3.5 w-3.5 text-[#3D5AFE]" />
        </div>
        <MonoLabel tone="faint" className="text-[10px]">{'// '}{label}</MonoLabel>
      </div>
      <div className="text-[14px] font-medium text-[var(--sage-ink)] mb-2">{title}</div>
      <p className="text-[13px] text-[var(--sage-ink-faint)] leading-relaxed mb-4">{body}</p>
      <CtaLink href={href} variant="text" arrow>
        {cta}
      </CtaLink>
    </Surface>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Export (Suspense wrapper for useSearchParams)
// ────────────────────────────────────────────────────────────────────────────

export function ContactRelaunchContent() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--sage-bg)]" />}>
      <ContactInner />
    </Suspense>
  )
}

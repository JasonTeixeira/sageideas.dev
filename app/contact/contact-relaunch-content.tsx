'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, CheckCircle2, Clock, Loader2, MessageSquare, Rocket, Search, UserCheck } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { Button } from '@/components/ui/button'
import { extendedTiersBySlug } from '@/data/services/extended'
import { tiersBySlug, careTiers } from '@/data/services/tiers'
import { CapacitySignal } from '@/components/social-proof/capacity-signal'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

type EngagementType = 'studio' | 'project' | 'consult'

const TYPE_TABS: { value: EngagementType; label: string; tagline: string }[] = [
  { value: 'studio', label: 'Studio Engagement', tagline: 'Embedded — months, not days' },
  { value: 'project', label: 'Project', tagline: 'Scoped delivery with a fixed outcome' },
  { value: 'consult', label: 'Consult', tagline: 'A focused call or short review' },
]

const TIMELINE_OPTS = [
  { value: 'asap', label: 'ASAP — within 2 weeks' },
  { value: '2-4w', label: '2–4 weeks out' },
  { value: '1-2m', label: '1–2 months out' },
  { value: '3m+', label: '3+ months out' },
  { value: 'exploring', label: 'Just exploring' },
]

const BUDGET_OPTS: Record<EngagementType, { value: string; label: string }[]> = {
  studio: [
    { value: '25-50k', label: '$25–50k / month' },
    { value: '50-100k', label: '$50–100k / month' },
    { value: '100k+', label: '$100k+ / month' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
  project: [
    { value: '<10k', label: 'Under $10k' },
    { value: '10-25k', label: '$10–25k' },
    { value: '25-50k', label: '$25–50k' },
    { value: '50-100k', label: '$50–100k' },
    { value: '100k+', label: '$100k+' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
  consult: [
    { value: '<10k', label: 'Under $10k' },
    { value: '10-25k', label: '$10–25k' },
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

// Map engagement slug → default tab + prefilled context.
// Sources: extendedTiersBySlug (22 AI/automation services), tiersBySlug (9 productized),
// careTiers (3 retainers), plus custom keywords.
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
    const type: EngagementType = isRetainer
      ? 'studio'
      : isDiagnostic
        ? 'consult'
        : 'project'
    const prefill = isFlagship
      ? `Interested in: ${ext.name} (${ext.price}, ${ext.timeline}).\n\nMy business / use case: \n\nWhat I want the agent to handle: \n\nTools we already use: \n\nAnything custom or out-of-scope to discuss: `
      : `Interested in: ${ext.name} (${ext.price}). \n\nContext: `
    return {
      type,
      badge: ext.name,
      prefill,
    }
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
      prefill:
        'Looking for a custom-scoped engagement. \n\nWhat we need: ',
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

function ContactInner() {
  const params = useSearchParams()
  const engagementCtx = useMemo(
    () => resolveEngagementContext(params.get('engagement')),
    [params]
  )
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

  // Reset budget when type changes if current value isn't valid
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#09090B]">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 mb-6">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#10B981]">Inquiry received</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-normal text-[#FAFAFA] leading-tight">Got it. Check your inbox.</h1>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
              A confirmation just landed at <span className="text-[#FAFAFA] font-mono">{email}</span>. Every inquiry is
              read personally — well-matched ones get a response within 48 hours.
            </p>
            <p className="mt-3 text-sm text-[#78716C]">
              No match? You&apos;ll still hear back. We don&apos;t ghost.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold">
                <Link href="/work">See recent work</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#2A2826] text-[#FAFAFA] hover:bg-[#1A1917]">
                <Link href="/process">How engagements run</Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>Contact</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-normal text-[#FAFAFA] leading-tight">
            Start a conversation.
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
            Pick the engagement type that fits. The more specific you are about scope and timeline, the faster the
            reply — and the better the fit assessment.
          </p>
          {engagementCtx?.badge && (
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0ED3CF]/10 border border-[#0ED3CF]/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0ED3CF]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
                Pre-selected: {engagementCtx.badge}
              </span>
            </div>
          )}
        </motion.div>
      </section>

      {/* Capacity signal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
        <CapacitySignal />
      </section>

      {/* Type tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid sm:grid-cols-3 gap-3">
          {TYPE_TABS.map((tab) => {
            const active = engagementType === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setEngagementType(tab.value)}
                className={[
                  'text-left rounded-xl border p-5 transition',
                  active
                    ? 'border-[#0ED3CF] bg-[#0ED3CF]/[0.06] ring-1 ring-[#0ED3CF]/40'
                    : 'border-[#2A2826] bg-[#12110F] hover:border-[#3D3A37]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={[
                      'h-2 w-2 rounded-full',
                      active ? 'bg-[#0ED3CF]' : 'bg-[#3D3A37]',
                    ].join(' ')}
                  />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">{tab.value}</span>
                </div>
                <div className="text-base font-semibold text-[#FAFAFA]">{tab.label}</div>
                <div className="mt-1 text-sm text-[#A8A29E]">{tab.tagline}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <GlowCard glowColor="cyan" className="">
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
                    placeholder="Acme Inc."
                    className={inputClass}
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
                    maxLength={120}
                  />
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
                  <select value={budget} onChange={(e) => setBudget(e.target.value)} className={selectClass}>
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
                <div className="mt-1.5 text-xs text-[#57534E] font-mono">
                  {scope.length}/5000
                </div>
              </Field>

              {error && (
                <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/[0.06] px-4 py-3 text-sm text-[#FCA5A5]">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send inquiry <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-[#78716C]">
                  We respond to well-matched inquiries within 48 hours.
                </p>
              </div>
            </form>
          </GlowCard>

          {/* Sidebar */}
          <aside className="space-y-4">
            <SidebarCard
              icon={Calendar}
              label="Book"
              title="Prefer a call?"
              body="Skip the form and book a 30-minute strategy call. No pitch, no pressure."
              href="/book"
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
            <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
              <div className="text-xs font-mono uppercase tracking-widest text-[#78716C] mb-2">Privacy</div>
              <p className="text-sm text-[#A8A29E] leading-relaxed">
                Your info is handled per our{' '}
                <Link href="/legal/privacy" className="text-[#0ED3CF] hover:text-[#22D3EE] underline underline-offset-2">
                  Privacy Policy
                </Link>
                . We collect only what we need to respond and never sell personal data.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Who you're talking to + What to expect */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[360px_1fr] gap-8 items-start">
          {/* Face card */}
          <motion.div {...fadeInUp} className="rounded-2xl border border-[#2A2826] bg-[#12110F] overflow-hidden">
            <div className="relative aspect-[4/5] bg-[#0B0A09]">
              <Image
                src="/images/headshot.jpg"
                alt="Jason Teixeira, founder of Sage Ideas"
                fill
                sizes="360px"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="text-xs font-mono uppercase tracking-widest text-[#78716C]">Who replies</div>
              <div className="mt-1.5 text-base font-semibold text-[#FAFAFA]">Jason Teixeira</div>
              <div className="mt-0.5 text-sm text-[#A8A29E]">Founder · Sage Ideas Studio</div>
              <p className="mt-3 text-sm text-[#A8A29E] leading-relaxed">
                Every inquiry lands in my inbox. No SDR, no triage queue. You&apos;ll talk to the person doing the work.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#0B0A09] p-3">
                <Clock className="h-4 w-4 text-[#0ED3CF] shrink-0" />
                <div>
                  <div className="text-xs text-[#78716C]">Typical response</div>
                  <div className="text-sm font-semibold text-[#FAFAFA]">Within 1 business day</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* What to expect timeline */}
          <motion.div {...fadeInUp}>
            <SectionLabel>What to expect</SectionLabel>
            <h2 className="mt-3 text-3xl sm:text-4xl font-normal text-[#FAFAFA] tracking-tight">
              From inquiry to kickoff, in four steps.
            </h2>
            <p className="mt-3 text-[#A8A29E] leading-relaxed max-w-2xl">
              No black-box sales process. Here&apos;s exactly what happens after you submit.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: MessageSquare,
                  step: 'Step 1',
                  title: 'Reply within 1 business day',
                  body: 'A real response from me — not an autoresponder. Either we book a call or I tell you it\'s not a fit and point you somewhere better.',
                  duration: '< 24h',
                },
                {
                  icon: Search,
                  step: 'Step 2',
                  title: 'Discovery call (30–45 min)',
                  body: 'I dig into the actual problem, current state, and what "done" looks like. You leave with a clearer picture even if we don\'t work together.',
                  duration: 'Week 1',
                },
                {
                  icon: CheckCircle2,
                  step: 'Step 3',
                  title: 'Written scope + fixed quote',
                  body: 'A short written proposal: scope, milestones, price, timeline, and what\'s explicitly out of scope. No surprises later.',
                  duration: 'Week 1–2',
                },
                {
                  icon: Rocket,
                  step: 'Step 4',
                  title: 'Kickoff and first artifact',
                  body: 'On signing, we set up the shared workspace and ship the first deliverable inside the first week.',
                  duration: 'Week 2–3',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5 hover:border-[#3D3A37] transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#0ED3CF]/10 rounded-lg">
                        <item.icon className="h-4 w-4 text-[#0ED3CF]" />
                      </div>
                      <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">{item.step}</span>
                    </div>
                    <span className="text-xs font-mono text-[#0ED3CF]">{item.duration}</span>
                  </div>
                  <div className="text-base font-semibold text-[#FAFAFA] mb-2">{item.title}</div>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#57534E] focus:border-[#0ED3CF] focus:outline-none focus:ring-1 focus:ring-[#0ED3CF] transition'
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
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">{label}</span>
        {required && <span className="text-xs font-mono text-[#0ED3CF]">required</span>}
      </div>
      {children}
      {hint && <div className="mt-1.5 text-xs text-[#78716C]">{hint}</div>}
    </label>
  )
}

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
    <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-[#0ED3CF]/10 rounded-lg">
          <Icon className="h-4 w-4 text-[#0ED3CF]" />
        </div>
        <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">{label}</span>
      </div>
      <div className="text-base font-semibold text-[#FAFAFA] mb-2">{title}</div>
      <p className="text-sm text-[#A8A29E] leading-relaxed mb-4">{body}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ED3CF] hover:text-[#22D3EE]"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

export function ContactRelaunchContent() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}>
      <ContactInner />
    </Suspense>
  )
}

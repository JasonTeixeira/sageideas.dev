import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionLabel } from '@/components/section-label'
import { ArrowRight, Mail, Calendar } from 'lucide-react'
import { FounderPortrait } from '@/components/founder-portrait'
import { PageHeroBg } from '@/components/page-hero-bg'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/book' },
  title: 'Book a Discovery Call',
  description:
    'Schedule a 30-minute discovery call with Sage Ideas. No pitch deck. No obligation. Just a direct conversation about your project.',
  openGraph: {
    title: 'Book a Discovery Call',
    description: "30 minutes. No pitch deck. No obligation.",
    images: [{ url: '/og?title=Book+a+Call&subtitle=Let%27s+talk.' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ["/og?title=Book+a+Call&subtitle=Let%27s+talk."],
  },
}

export default function BookPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <PageHeroBg src="/images/hero-abstract.jpg" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="max-w-2xl">
            <SectionLabel>Discovery Call</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-normal text-[#FAFAFA] leading-tight">
              Book a 30-minute
              <br />
              <span className="text-[#0ED3CF]">discovery call.</span>
            </h1>
            <p className="mt-5 text-lg text-[#A8A29E] leading-relaxed">
              30 minutes. No pitch deck. No obligation. Just a direct conversation.
            </p>
          </div>

          {/* What to expect */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="rounded-xl bg-[#12110F] border border-[#2A2826] p-4">
              <p className="text-xs font-mono text-[#0ED3CF] uppercase tracking-widest mb-2">
                We&apos;ll cover
              </p>
              <ul className="space-y-1.5">
                {[
                  "What you're trying to build or fix",
                  "What you've already tried",
                  "Your timeline and constraints",
                  "Whether a tier is the right fit",
                ].map((item) => (
                  <li key={item} className="text-sm text-[#A8A29E] flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#0ED3CF] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#12110F] border border-[#2A2826] p-4">
              <p className="text-xs font-mono text-[#0ED3CF] uppercase tracking-widest mb-2">
                Come prepared with
              </p>
              <ul className="space-y-1.5">
                {[
                  "What success looks like in 30–90 days",
                  "An approximate budget range",
                  "Your timeline (any hard deadlines?)",
                  "A few sentences about your project",
                ].map((item) => (
                  <li key={item} className="text-sm text-[#A8A29E] flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#78716C] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Direct intake — no third-party embed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-[#2A2826] bg-gradient-to-br from-[#12110F] to-[#1A1917] p-8 sm:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-[#0ED3CF] uppercase tracking-widest mb-3">
              Two ways to start
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#FAFAFA] tracking-tight">
              Pick what feels lighter.
            </h2>
            <p className="mt-3 text-[#A8A29E] leading-relaxed">
              Both go to the same inbox. The structured intake is faster — you get a written reply within 24 hours with concrete next steps.
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <Link
              href="/contact?type=consult&source=book"
              className="group rounded-xl border border-[#2A2826] bg-[#0B0A09] p-6 hover:border-[#0ED3CF] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#0ED3CF]" />
                </div>
                <span className="text-xs font-mono text-[#0ED3CF] uppercase tracking-widest">Recommended</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#FAFAFA]">Structured intake</h3>
              <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">
                A 5-minute form. You get a written reply within 24 hours with a recommended path, scope, and ballpark price. No call required to start.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0ED3CF] group-hover:text-[#22D3EE] transition-colors">
                Start intake <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <a
              href="mailto:sage@sageideas.dev?subject=Discovery%20call%20request&body=Hi%20Sage%2C%0A%0AI%27d%20like%20to%20schedule%20a%2030-minute%20discovery%20call.%0A%0AProject%20overview%3A%0A%0ATimeline%3A%0A%0ABudget%20range%3A%0A%0ASome%20times%20that%20work%20for%20me%3A%0A%0AThanks%2C%0A"
              className="group rounded-xl border border-[#2A2826] bg-[#0B0A09] p-6 hover:border-[#0ED3CF] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E85D3A]/10 border border-[#E85D3A]/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#E85D3A]" />
                </div>
                <span className="text-xs font-mono text-[#E85D3A] uppercase tracking-widest">Direct</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#FAFAFA]">Email Sage directly</h3>
              <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">
                Prefer to skip the form? Reply with project overview, timeline, budget range, and times that work — you&apos;ll get scheduling options back same day.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#E85D3A] group-hover:text-[#A78BFA] transition-colors">
                sage@sageideas.dev <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>

        {/* Founder sidebar */}
        <div className="mt-16 flex flex-col lg:flex-row gap-8 items-start">
          <div className="lg:w-48 shrink-0">
            <FounderPortrait size="md" caption={false} />
            <p className="mt-3 text-center text-xs text-[#78716C] font-mono">Jason Teixeira</p>
          </div>
          <div className="flex-1 rounded-xl border border-[#2A2826] bg-[#12110F] p-6">
            <p className="text-sm text-[#A8A29E] leading-relaxed">
              &ldquo;I take these calls myself. No sales rep, no account manager. If we&rsquo;re a fit,
              I&rsquo;ll tell you exactly what I&rsquo;d build, how long it takes, and what it costs.
              If we&rsquo;re not, I&rsquo;ll tell you that too.&rdquo;
            </p>
          </div>
        </div>

        {/* What to expect strip */}
        <div className="mt-16 grid sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              label: 'Discovery',
              desc: 'A 30-minute working conversation — not a sales call. We talk through your problem, your constraints, and what success looks like.',
            },
            {
              step: '02',
              label: 'Proposal',
              desc: 'Within 48 hours, you receive a written scope and fixed-price proposal. No ambiguity. You know exactly what you\'re getting.',
            },
            {
              step: '03',
              label: 'Decision',
              desc: 'You sign, we kick off. Or you don\'t — no pressure, no follow-up sequence. If it\'s not the right fit, we\'ll say that directly.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-[#2A2826] bg-[#12110F] p-6"
            >
              <span className="text-xs font-mono text-[#0ED3CF] uppercase tracking-widest">
                {item.step}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-[#FAFAFA]">{item.label}</h3>
              <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>


      </section>
    </div>
  )
}

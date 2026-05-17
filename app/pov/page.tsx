import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/pov' },
  title: 'POV',
  description:
    'Why Sage Ideas refuses to ship anything that can\u2019t be rolled back in 30 seconds, and what that decision costs (and saves).',
  openGraph: {
    title: 'POV \u2014 The 30-Second Rollback Rule',
    description: 'How Sage Ideas decides what to ship.',
    images: [
      '/og?title=The+30-Second+Rollback+Rule&subtitle=Sage+Ideas+POV',
    ],
  },
}

export default function POVPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(6,182,212,0.10),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.08),transparent_55%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <SectionLabel>Sage Ideas · POV</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA] tracking-tight leading-[1.05]">
            Why we refuse to ship anything that can&rsquo;t be rolled back in
            30 seconds.
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
            One rule. It changes what you build, what you charge, and who hires
            you. Worth writing down.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-[#78716C]">
            <span>Sage Ideas Studio</span>
            <span aria-hidden>·</span>
            <span>~7 min read</span>
            <span aria-hidden>·</span>
            <span>First published 2026</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-7 text-[#D4D4D8] text-lg leading-[1.75]">
          <p className="text-2xl text-[#FAFAFA] font-medium leading-snug">
            Most software shipped this year cannot be rolled back. Not in 30
            seconds. Not in 30 minutes. In some cases, not at all without a
            war-room and a written apology to customers.
          </p>

          <p>
            That is a strategic posture, not an accident. Teams ship one-way
            doors because the incentives reward velocity over reversibility,
            and because nobody fails a sprint review for shipping fast. They
            fail it for shipping slow.
          </p>

          <p>
            The studio takes the opposite bet. Every change we ship to a
            production system either rolls back in under 30 seconds, or it
            doesn&rsquo;t ship that day. That is the rule. It is annoying. It
            is opinionated. It is the single most valuable engineering habit we
            have, and it is the reason a one-person studio can credibly run
            production fintech, billing systems, and AI-native products without
            a 24/7 ops team behind it.
          </p>

          <h2 className="pt-6 text-2xl sm:text-3xl font-normal text-[#FAFAFA] tracking-tight">
            What &ldquo;30-second rollback&rdquo; actually means.
          </h2>

          <p>
            It is not a slogan. It is a literal operational constraint that
            forces a set of design decisions before the first line of code is
            written.
          </p>

          <ul className="space-y-3 pl-0 list-none">
            {[
              'Every deployment is a single artifact, behind a single switch. Vercel deploy, Docker tag, Terraform apply. One handle.',
              'Database migrations are additive-only. We add columns; we don\u2019t drop them in the same release. We dual-write before we cut over.',
              'Webhook handlers are idempotent and event-deduplicated. Replays are safe by construction \u2014 not by hope.',
              'Feature flags wrap every change to user-visible behavior. The flag flip is the rollback.',
              'No release happens without a one-line undo in the runbook. If the undo isn\u2019t obvious, the change isn\u2019t ready.',
            ].map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[#0ED3CF] font-mono text-sm pt-1 shrink-0">
                  0{i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p>
            That list looks like overhead until the first time something goes
            wrong on a Friday afternoon. Then it looks like the only sane way
            anyone has ever shipped software.
          </p>

          <h2 className="pt-6 text-2xl sm:text-3xl font-normal text-[#FAFAFA] tracking-tight">
            The cost is real. So is the math.
          </h2>

          <p>
            The 30-second rule is not free. It adds up-front design time,
            slows certain refactors, and rules out a few flashy patterns that
            look great in conference talks. We have shipped fewer features
            because of it. We have also never had to write a customer apology
            for a billing incident, lost user data, or a deployment we
            couldn&rsquo;t reverse.
          </p>

          <p>
            On Nexural, the studio&rsquo;s production fintech platform, the
            rule shows up as zero billing incidents since launch across
            hundreds of Stripe webhook events, including one stretch where
            Stripe replayed events for a different reason than usual and the
            entire integration kept its composure because it was built to
            assume replays from day one. That is not heroics. That is a
            constraint paying out.
          </p>

          <h2 className="pt-6 text-2xl sm:text-3xl font-normal text-[#FAFAFA] tracking-tight">
            Why this matters for the people who hire us.
          </h2>

          <p>
            Most founders don&rsquo;t buy a development engagement because
            they want code. They buy it because they want a system that
            doesn&rsquo;t wake them up at night and doesn&rsquo;t cost them a
            customer when something breaks. Reversibility is the closest thing
            in software to a money-back guarantee on operational pain.
          </p>

          <p>
            When we tell a founder &ldquo;we won&rsquo;t ship this until we can
            roll it back in 30 seconds,&rdquo; we are also telling them: the
            engagement won&rsquo;t end with a binder of tribal knowledge that
            only the original author can decode. The rule forces clarity.
            Clarity transfers.
          </p>

          <h2 className="pt-6 text-2xl sm:text-3xl font-normal text-[#FAFAFA] tracking-tight">
            What it looks like in practice.
          </h2>

          <p>
            On a studio engagement, the rule shows up in three places.{' '}
            <span className="text-[#FAFAFA]">During scoping,</span> we agree on
            which surfaces are reversible and which are not, and we plan the
            irreversible ones (data deletes, externally-visible URL changes,
            money movement) in dedicated, slow, double-confirmed batches.{' '}
            <span className="text-[#FAFAFA]">During build,</span> every PR
            description includes the rollback note. No note, no merge.{' '}
            <span className="text-[#FAFAFA]">During handoff,</span> the
            runbook documents the one-line undo for every shipped surface, in
            the language of the person who has to push the button at 2 a.m.
          </p>

          <h2 className="pt-6 text-2xl sm:text-3xl font-normal text-[#FAFAFA] tracking-tight">
            The studio takes one bet on every engagement.
          </h2>

          <p>
            The bet is that founders who hire a studio in 2026 are tired of
            the velocity-over-reversibility trade and ready to pay for the
            other side. We win that bet about as often as we lose it. The
            people who get it become long-term clients. The people who
            don&rsquo;t go elsewhere. Both outcomes are fine.
          </p>

          <p>
            The studio is going to keep shipping software the same way for the
            same reason a good kitchen keeps a clean line: not because anyone
            is watching, but because the cost of doing it the other way is
            higher than it looks until the day it isn&rsquo;t.
          </p>

          <p className="text-xl text-[#FAFAFA] font-medium pt-4 leading-snug">
            If you can&rsquo;t roll it back in 30 seconds, it&rsquo;s not done
            shipping yet. Everything else follows from that.
          </p>
        </div>

        {/* Sign-off */}
        <div className="mt-16 pt-10 border-t border-[#2A2826]">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#78716C] mb-2">
                Written by
              </div>
              <div className="text-base text-[#FAFAFA] font-medium">
                Jason Teixeira
              </div>
              <div className="text-sm text-[#A8A29E]">
                Founder, Sage Ideas Studio
              </div>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 text-[#0ED3CF] hover:text-[#22D3EE] text-sm font-medium group"
            >
              Bring this rule to your next engagement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </article>

      {/* Related */}
      <section className="border-t border-[#2A2826] bg-[#0B0A09]/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionLabel>Where this rule shows up in the work</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <Link
              href="/work/nexural"
              className="group flex items-center justify-between bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 rounded-2xl px-6 py-5 transition-all"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-1">
                  Case study
                </div>
                <div className="text-sm text-[#FAFAFA]">
                  Nexural — zero billing incidents across hundreds of Stripe
                  webhooks.
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#78716C] group-hover:text-[#0ED3CF] group-hover:translate-x-1 transition-all" />
            </Link>
            <Link
              href="/work/aws-landing-zone"
              className="group flex items-center justify-between bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 rounded-2xl px-6 py-5 transition-all"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-1">
                  Case study
                </div>
                <div className="text-sm text-[#FAFAFA]">
                  AWS Landing Zone — every change reversible by Terraform plan.
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#78716C] group-hover:text-[#0ED3CF] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

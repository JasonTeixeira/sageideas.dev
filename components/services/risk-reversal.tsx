import { ShieldCheck, Calendar, Unlock } from 'lucide-react'

const pillars = [
  {
    icon: ShieldCheck,
    title: "Money-back if you're not happy in week 1",
    body: "Reset the engagement before momentum builds. No invoices to dispute, no awkward email.",
  },
  {
    icon: Calendar,
    title: 'Async-first, weekly demos, no surprises',
    body: 'You see exactly what shipped each week. No status meetings to attend, no reports to chase.',
  },
  {
    icon: Unlock,
    title: 'Code is yours from day 1 — no lock-in',
    body: 'Your repo, your infra, your accounts. We work in your stack. You can take the work in-house at any time.',
  },
] as const

export function RiskReversal() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-2xl border border-[#0ED3CF]/20 bg-gradient-to-br from-[#0ED3CF]/[0.04] to-transparent p-6 sm:p-8">
        <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
          How we reduce risk
        </span>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5"
            >
              <p.icon className="w-5 h-5 text-[#0ED3CF] mb-3" />
              <h3 className="text-sm font-semibold text-[#FAFAFA] leading-snug">
                {p.title}
              </h3>
              <p className="mt-1.5 text-xs text-[#A8A29E] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

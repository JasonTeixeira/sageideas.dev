'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Github, CheckCircle2, Building2, GraduationCap, Award, Calendar } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { Button } from '@/components/ui/button'
import { FounderPortrait } from '@/components/founder-portrait'
import { SocialBadges } from '@/components/founder/social-badges'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

interface Props {
  capabilities: string[]
  principles: string[]
}

const experience = [
  {
    role: 'Founder & Principal',
    company: 'Sage Ideas LLC',
    period: '2024–Present',
    summary:
      'Founded and operate the studio. Engagements span audits, sprints, builds, and operate retainers across fintech, trades tech, edtech, and developer tooling. Every engagement runs on fixed scope, fixed price, with the deliverable artifacts named before kickoff.',
  },
  {
    role: 'Fintech Engineer',
    company: 'HighStrike',
    period: '2021–2026',
    summary:
      'Built and maintained production trading infrastructure: market data ingestion, real-time pricing systems, portfolio management APIs, and billing integrations. Five years across the full stack on systems that handled production load during volatile sessions.',
  },
]

const education = [
  { degree: 'B.S. Computer Science', school: 'Full Sail University' },
  { degree: 'B.S. Finance', school: 'Kean University' },
]

const certGroups = [
  {
    provider: 'ISTQB',
    certs: ['Certified Tester Foundation Level (CTFL)', 'Test Automation Engineer (TAE)', 'Certified Tester AI Testing (CT-AI)'],
  },
  {
    provider: 'Amazon Web Services',
    certs: [
      'Cloud Practitioner',
      'Solutions Architect — Associate',
      'Developer — Associate',
      'SysOps Administrator — Associate',
      'DevOps Engineer — Professional',
    ],
  },
  {
    provider: 'Cisco',
    certs: ['CCNA (Routing & Switching)'],
  },
]

export function FounderAnimations({ capabilities, principles }: Props) {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>Founder</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-bold text-[#FAFAFA] leading-tight">
            Jason Teixeira.
          </h1>
          <p className="mt-6 text-xl text-[#A8A29E] leading-relaxed font-medium">
            Fintech engineer. Studio founder. The person on every Sage Ideas engagement — first
            call, last commit, signed handoff.
          </p>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
            Five years inside fintech engineering taught me one thing well: the gap between a
            product that works in a demo and a product that survives a Stripe webhook retry
            storm at 2 a.m. is the entire job. Most agencies sell you the demo. The studio that
            grew out of that experience sells you the part nobody likes building — the
            idempotency keys, the row-level security, the migrations that don’t lose data, the
            CI gates that catch the bug before the customer does.
          </p>
          <p className="mt-4 text-lg text-[#A8A29E] leading-relaxed">
            Sage Ideas is one operator by design, not by accident. The person who scopes the
            work is the person who builds it. There is no offshore bench, no account manager,
            no “lead consultant” who disappears after the kickoff. You buy the keyboard. That is
            the whole proposition.
          </p>
        </motion.div>

        {/* Headshot + quick facts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-16 grid md:grid-cols-[320px_1fr] gap-10 lg:gap-14 max-w-5xl items-start"
        >
          <div>
            <FounderPortrait size="lg" priority />
            <SocialBadges className="mt-5" />
          </div>

          {/* Quick facts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#12110F] border border-[#2A2826] rounded-xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2">Based</p>
              <p className="text-sm text-[#FAFAFA] font-medium">Orlando, Florida</p>
              <p className="text-xs text-[#78716C] mt-1">Remote-first, U.S. business hours</p>
            </div>
            <div className="p-4 bg-[#12110F] border border-[#2A2826] rounded-xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2">Languages</p>
              <p className="text-sm text-[#FAFAFA] font-medium">English · Portuguese · Spanish</p>
              <p className="text-xs text-[#78716C] mt-1">Native English; fluent in others</p>
            </div>
            <div className="p-4 bg-[#12110F] border border-[#2A2826] rounded-xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2">Experience</p>
              <p className="text-sm text-[#FAFAFA] font-medium">5 years fintech · 2 years studio</p>
              <p className="text-xs text-[#78716C] mt-1">Production systems and operating businesses</p>
            </div>
            <div className="p-4 bg-[#12110F] border border-[#2A2826] rounded-xl">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2">Reach</p>
              <p className="text-sm text-[#FAFAFA] font-medium">
                <a href="mailto:sage@sageideas.dev" className="text-[#0ED3CF] hover:text-[#22D3EE]">
                  sage@sageideas.dev
                </a>
              </p>
              <p className="text-xs text-[#78716C] mt-1">Replies within 48 business hours</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The studio approach */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>The Studio Approach</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-8">
              Why a one-person studio is the offer, not the limitation.
            </h2>
            <p className="text-[#A8A29E] text-lg leading-relaxed max-w-3xl mb-10">
              Most agencies sell you a lead practitioner on the call and hand the work off the moment the contract
              signs. Sage Ideas does the opposite. The work is the deliverable, and the work is built by the same person
              who pitched it. That is the whole proposition. Productized tiers exist so engagements start fast, but
              custom engagements, retainers, and ongoing care are always available.
            </p>
          </motion.div>

          <div className="max-w-3xl space-y-3">
            {principles.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex items-start gap-3 p-4 bg-[#09090B] border border-[#2A2826] rounded-xl"
              >
                <CheckCircle2 className="h-5 w-5 text-[#0ED3CF] mt-0.5 flex-shrink-0" />
                <span className="text-[#A8A29E]">{p}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-track frame */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Two Tracks</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-8">
            How engagements work.
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <GlowCard className="h-full border-l-2 border-l-[#0ED3CF]">
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-[#0ED3CF]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">Productized</span>
                </div>
                <h3 className="text-xl font-semibold text-[#FAFAFA] mb-3">Audit, Sprint, Build, Operate</h3>
                <p className="text-[#A8A29E] text-sm leading-relaxed">
                  Nine fixed-price tiers from $750 audits to multi-month builds. Scope is named, deliverables are
                  itemized, and timelines are written in. Pick a tier, sign the SOW, ship.
                </p>
                <Link
                  href="/services"
                  className="mt-4 inline-flex items-center text-[#0ED3CF] hover:text-[#22D3EE] text-sm font-medium transition-colors group"
                >
                  See all tiers
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </GlowCard>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlowCard className="h-full border-l-2 border-l-[#E85D3A]" glowColor="violet">
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-[#E85D3A]" />
                  <span className="text-xs font-mono uppercase tracking-widest text-[#E85D3A]">Custom & Care</span>
                </div>
                <h3 className="text-xl font-semibold text-[#FAFAFA] mb-3">Retainers, custom packages, ongoing care</h3>
                <p className="text-[#A8A29E] text-sm leading-relaxed">
                  When the productized tiers don&apos;t fit, we build a custom engagement. Site Care, Brand Care, and
                  Content Care retainers keep work moving month over month. Open to bespoke scopes — just ask.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center text-[#E85D3A] hover:text-[#A78BFA] text-sm font-medium transition-colors group"
                >
                  Start a conversation
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </section>

      {/* Background */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>Background</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-10">The background.</h2>
          </motion.div>

          {/* Experience */}
          <div className="space-y-6 max-w-3xl mb-12">
            {experience.map((exp, i) => (
              <motion.div
                key={exp.company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <GlowCard>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold text-[#FAFAFA]">{exp.role}</p>
                        <p className="text-sm text-[#0ED3CF]">{exp.company}</p>
                      </div>
                      <span className="text-xs font-mono text-[#78716C] bg-[#2A2826] px-3 py-1 rounded-full whitespace-nowrap">
                        {exp.period}
                      </span>
                    </div>
                    <p className="text-sm text-[#A8A29E] leading-relaxed">{exp.summary}</p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>

          {/* Education */}
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-[#0ED3CF]" />
              <h3 className="text-lg font-semibold text-[#FAFAFA]">Education</h3>
            </div>
            <div className="flex flex-wrap gap-3 max-w-3xl">
              {education.map((edu) => (
                <div
                  key={edu.degree}
                  className="px-4 py-2 bg-[#09090B] border border-[#2A2826] rounded-xl"
                >
                  <p className="text-sm font-medium text-[#FAFAFA]">{edu.degree}</p>
                  <p className="text-xs text-[#78716C]">{edu.school}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Certifications */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Certifications</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-3">9 active certifications.</h2>
          <p className="text-[#A8A29E] mb-10 max-w-2xl">
            Each one reflects a domain where the studio works. All active and maintained.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl">
          {certGroups.map((group, i) => (
            <motion.div
              key={group.provider}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-5 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <p className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF] mb-4">{group.provider}</p>
              <ul className="space-y-2">
                {group.certs.map((cert) => (
                  <li key={cert} className="flex items-start gap-2 text-sm text-[#A8A29E]">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                    {cert}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you get on every engagement */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>Capabilities</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-3">What lands on every engagement.</h2>
            <p className="text-[#A8A29E] mb-10 max-w-2xl">
              The studio is intentionally narrow on offer surface and broad on capability. Whatever the engagement —
              audit, sprint, build, or operate — these are the disciplines on the table.
            </p>
          </motion.div>
          <div className="max-w-3xl space-y-3">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex items-start gap-3 p-4 bg-[#09090B] border border-[#2A2826] rounded-xl"
              >
                <CheckCircle2 className="h-5 w-5 text-[#0ED3CF] mt-0.5 flex-shrink-0" />
                <span className="text-[#A8A29E]">{cap}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to start */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Get Started</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-10">How to start a conversation.</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          {[
            {
              step: '01',
              title: 'Send a quick note',
              body: 'Send a structured inquiry — what you are working on, where it is stuck, what success would look like. Most replies land within 48 business hours.',
              cta: 'Send a message',
              href: '/contact?source=founder',
              external: false,
              icon: Mail,
            },
            {
              step: '02',
              title: 'Book a 30-minute intro',
              body: 'Or skip the email. The intro call is a focused conversation about the problem, the constraints, and which engagement type fits — productized tier, custom scope, or retainer.',
              cta: 'Book a call',
              href: '/book',
              external: false,
              icon: Calendar,
            },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <GlowCard className="h-full">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl font-bold text-[#2A2826] font-mono">{step.step}</span>
                      <Icon className="h-5 w-5 text-[#0ED3CF]" />
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-[#FAFAFA] mb-3">{step.title}</h3>
                    <p className="text-sm text-[#A8A29E] leading-relaxed mb-6">{step.body}</p>
                    <Link
                      href={step.href}
                      className="inline-flex items-center text-[#0ED3CF] hover:text-[#22D3EE] text-sm font-medium transition-colors group"
                    >
                      {step.cta}
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </GlowCard>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Footer CTA strip */}
      <section className="bg-[#12110F] border-t border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap gap-4 items-center"
          >
            <Button
              asChild
              className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold"
            >
              <Link href="/contact?source=founder-footer">
                <Mail className="mr-2 h-4 w-4" />
                Send an inquiry
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
            >
              <Link href="/book">
                <Calendar className="mr-2 h-4 w-4" />
                Book a call
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
            >
              <a href="https://github.com/JasonTeixeira" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <span className="text-[#78716C] text-sm ml-auto hidden sm:block">
              See the work:{' '}
              <Link href="/work" className="text-[#0ED3CF] hover:text-[#22D3EE]">
                Case studies →
              </Link>
            </span>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

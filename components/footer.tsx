'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, ArrowRight } from 'lucide-react'

// Services grouped by outcome — no prices, no menu-card vibe.
const servicesBuild = [
  { href: '/services/build', label: 'Build' },
  { href: '/services/ship', label: 'Ship' },
  { href: '/services/app-development', label: 'App Development' },
  { href: '/services/automate', label: 'Automate' },
  { href: '/services/brand-sprint', label: 'Brand Sprint' },
]

const servicesGrow = [
  { href: '/services/audit', label: 'Sage Audit' },
  { href: '/services/seo-sprint', label: 'SEO Sprint' },
  { href: '/services/content-engine', label: 'Content Engine' },
  { href: '/services/scale', label: 'Scale' },
]

const servicesOperate = [
  { href: '/services/operate', label: 'Operate' },
  { href: '/services/site-care', label: 'Site Care' },
  { href: '/services/brand-care', label: 'Brand Care' },
  { href: '/services/content-care', label: 'Content Care' },
]

const studio = [
  { href: '/services', label: 'All Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/work', label: 'Case Studies' },
  { href: '/lab', label: 'The Lab' },
  { href: '/blog', label: 'Insights' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/studio', label: 'The Studio' },
  { href: '/founder', label: 'Founder' },
  { href: '/process', label: 'Process' },
  { href: '/trust', label: 'Trust' },
  { href: '/contact', label: 'Contact' },
]

const legal = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/msa', label: 'MSA' },
  { href: '/legal/nda', label: 'NDA' },
  { href: '/legal/sow-template', label: 'SOW' },
]

const connect = [
  { href: 'mailto:sage@sageideas.dev', label: 'sage@sageideas.dev', icon: Mail },
  { href: 'https://linkedin.com/in/jason-teixeira', label: 'LinkedIn', icon: Linkedin },
  { href: 'https://github.com/JasonTeixeira', label: 'GitHub', icon: Github },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-[#09090B] border-t border-[#2A2826] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0ED3CF]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <motion.div
            className="col-span-2 md:col-span-4 lg:col-span-4 space-y-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-xl font-bold text-[#FAFAFA] tracking-tight hover:text-[#0ED3CF] transition-colors group"
            >
<img src="/brand/sage-logo.png" alt="" className="h-8 w-auto" aria-hidden />
              <span className="tracking-[0.08em] text-[17px] font-semibold">SAGE IDEAS</span>
            </Link>
            <p className="text-sm text-[#A8A29E] leading-relaxed max-w-sm">
              AI-native studio that builds, automates, and scales B2B businesses. We ship
              the same stack we run our own products on.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0ED3CF] text-[#09090B] text-sm font-semibold hover:bg-[#0AA8A5] transition-colors group"
            >
              Book a strategy call
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2 pt-1">
              {connect.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={item.label}
                  className="p-2 text-[#A8A29E] hover:text-[#0ED3CF] hover:bg-[#1A1917] rounded-lg transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Services — Build */}
          <FooterColumn title="Build" links={servicesBuild} className="lg:col-span-2" />
          {/* Services — Grow */}
          <FooterColumn title="Grow" links={servicesGrow} className="lg:col-span-2" />
          {/* Services — Operate */}
          <FooterColumn title="Operate" links={servicesOperate} className="lg:col-span-2" />
          {/* Studio */}
          <FooterColumn title="Studio" links={studio} className="lg:col-span-2" />
        </div>

        <div className="mt-16 pt-8 border-t border-[#2A2826] flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-[#78716C]">
          <p>© {year} Sage Ideas LLC · Orlando, FL · All rights reserved.</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legal.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-[#0ED3CF] transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
  className = '',
}: {
  title: string
  links: { href: string; label: string }[]
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`space-y-4 ${className}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FAFAFA]">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[#A8A29E] hover:text-[#0ED3CF] transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

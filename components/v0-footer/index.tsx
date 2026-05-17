'use client'

import { motion } from 'framer-motion'
import { FooterBrand } from './footer-brand'
import { FooterColumn } from './footer-column'
import { FooterBottom } from './footer-bottom'

const navColumns = [
  {
    heading: 'Build',
    links: [
      { label: 'Build', href: '/build' },
      { label: 'Ship', href: '/build/ship' },
      { label: 'App Development', href: '/build/app-development' },
      { label: 'Automate', href: '/build/automate' },
      { label: 'Brand Sprint', href: '/build/brand-sprint' },
    ],
  },
  {
    heading: 'Grow',
    links: [
      { label: 'Grow', href: '/grow' },
      { label: 'Sage Audit', href: '/grow/audit' },
      { label: 'SEO Sprint', href: '/grow/seo' },
      { label: 'Content Engine', href: '/grow/content' },
      { label: 'Scale', href: '/grow/scale' },
    ],
  },
  {
    heading: 'Operate',
    links: [
      { label: 'Operate', href: '/operate' },
      { label: 'Site Care', href: '/operate/site-care' },
      { label: 'Brand Care', href: '/operate/brand-care' },
      { label: 'Content Care', href: '/operate/content-care' },
    ],
  },
  {
    heading: 'Studio',
    links: [
      { label: 'All Services', href: '/services' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Case Studies', href: '/work' },
      { label: 'Lab', href: '/lab' },
      { label: 'Insights', href: '/insights' },
      { label: 'Process', href: '/process' },
      { label: 'Founder', href: '/founder' },
      { label: 'Trust', href: '/trust' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

interface SageFooterProps {
  logo?: React.ReactNode
}

export function SageFooter({ logo }: SageFooterProps) {
  return (
    <footer
      className="relative w-full overflow-hidden"
      style={{ background: '#09090B' }}
      aria-label="Site footer"
    >
      {/* Gradient rule: teal → coral → transparent */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #0ED3CF 20%, #E85D3A 60%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Subtle top glow bleed */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-[0.04]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, #0ED3CF, transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          {/* Col 1 — Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <FooterBrand logo={logo} delay={0} />
          </div>

          {/* Cols 2-5 — Link columns */}
          {navColumns.map((col, i) => (
            <FooterColumn
              key={col.heading}
              heading={col.heading}
              links={col.links}
              delay={0.08 * (i + 1)}
            />
          ))}
        </div>

        {/* Divider + bottom bar */}
        <div className="mt-14">
          <FooterBottom />
        </div>
      </div>

      {/* Faint dot-grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #F4F2EF 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />
    </footer>
  )
}

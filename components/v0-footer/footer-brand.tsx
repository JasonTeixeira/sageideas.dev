'use client'

import { motion } from 'framer-motion'
import { Mail, Linkedin, Github } from 'lucide-react'

interface FooterBrandProps {
  logo?: React.ReactNode
  delay?: number
}

const DefaultLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect width="36" height="36" rx="8" fill="#0ED3CF" fillOpacity="0.12" />
    <path
      d="M10 24 L18 12 L26 24"
      stroke="#0ED3CF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.5 19.5 L22.5 19.5"
      stroke="#0ED3CF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="18" cy="12" r="2" fill="#E85D3A" />
  </svg>
)

const socials = [
  {
    icon: Mail,
    href: 'mailto:hello@sageideas.studio',
    label: 'Email Sage Ideas',
  },
  {
    icon: Linkedin,
    href: 'https://linkedin.com/company/sageideas',
    label: 'Sage Ideas on LinkedIn',
  },
  {
    icon: Github,
    href: 'https://github.com/sageideas',
    label: 'Sage Ideas on GitHub',
  },
]

export function FooterBrand({ logo, delay = 0 }: FooterBrandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-6"
    >
      {/* Logo + wordmark */}
      <div className="flex items-center gap-3">
        {logo ?? <DefaultLogo />}
        <span className="text-sm font-semibold tracking-[0.22em] uppercase text-[#F4F2EF]">
          Sage Ideas
        </span>
      </div>

      {/* Tagline */}
      <p className="text-sm leading-relaxed text-[#A8A29E] max-w-[22ch]">
        AI&#8209;native studio that builds, automates, and scales B2B businesses.
      </p>

      {/* CTA */}
      <motion.a
        href="#contact"
        whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(14,211,207,0.25)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-[#0ED3CF] px-4 py-2 text-sm font-semibold text-[#09090B] transition-colors duration-200 hover:bg-[#2de2de]"
      >
        Book a strategy call →
      </motion.a>

      {/* Social icons */}
      <div className="flex items-center gap-3">
        {socials.map(({ icon: Icon, href, label }) => (
          <motion.a
            key={label}
            href={href}
            aria-label={label}
            whileHover={{ scale: 1.15, color: '#0ED3CF' }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#2A2826] bg-[#12110F] text-[#A8A29E] transition-colors duration-200 hover:border-[#0ED3CF]/40 hover:text-[#0ED3CF]"
          >
            <Icon size={15} strokeWidth={1.75} />
          </motion.a>
        ))}
      </div>
    </motion.div>
  )
}

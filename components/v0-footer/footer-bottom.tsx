'use client'

import { motion } from 'framer-motion'

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'MSA', href: '/msa' },
  { label: 'NDA', href: '/nda' },
]

export function FooterBottom() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-[#2A2826]"
    >
      <p className="text-xs text-[#A8A29E]">
        © 2024 Sage Ideas LLC · Orlando, FL
      </p>

      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {legalLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="group relative text-xs text-[#A8A29E] transition-colors duration-200 hover:text-[#F4F2EF]"
          >
            {link.label}
            <span className="absolute -bottom-px left-0 h-px w-0 bg-[#0ED3CF]/60 transition-all duration-300 group-hover:w-full" />
          </a>
        ))}
      </nav>
    </motion.div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { FooterLink } from './footer-link'

interface FooterColumnProps {
  heading: string
  links: Array<{ label: string; href: string }>
  delay?: number
}

export function FooterColumn({ heading, links, delay = 0 }: FooterColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-4"
    >
      <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#F4F2EF]">
        {heading}
      </p>
      <nav className="flex flex-col gap-2.5">
        {links.map((link) => (
          <FooterLink key={link.label} href={link.href}>
            {link.label}
          </FooterLink>
        ))}
      </nav>
    </motion.div>
  )
}

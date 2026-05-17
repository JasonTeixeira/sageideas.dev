'use client'

import { motion } from 'framer-motion'

interface FooterLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function FooterLink({ href, children, className = '' }: FooterLinkProps) {
  return (
    <motion.a
      href={href}
      className={`group relative inline-flex items-center gap-1 text-[#A8A29E] text-sm leading-relaxed transition-colors duration-200 hover:text-[#F4F2EF] ${className}`}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-px left-0 h-px w-0 bg-[#0ED3CF] transition-all duration-300 group-hover:w-full" />
      </span>
    </motion.a>
  )
}

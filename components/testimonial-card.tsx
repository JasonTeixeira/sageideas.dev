'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Quote, Phone } from 'lucide-react'
import type { Reference } from '@/data/references'

type Props = {
  reference: Reference
  index?: number
}

/**
 * Renders one testimonial / reference card.
 *
 * - If the reference is `attributed: true` (named, on-the-record), renders a
 *   real quote card with name, title, company.
 * - If `attributed: false`, renders an anonymous role-based reference card
 *   that surfaces the relationship + offers a reference call.
 *
 * This is the honest pattern. As named permissions arrive, flip the flag in
 * `data/references.ts` and add the quote — same component handles both.
 */
export function TestimonialCard({ reference: r, index = 0 }: Props) {
  const initials =
    r.attributed && r.name
      ? r.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
      : (r.role[0] + r.industry[0]).toUpperCase()

  if (r.attributed && r.quote && r.name) {
    return (
      <motion.figure
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        className="rounded-xl border border-[#2A2826] bg-[#12110F] p-6 hover:border-[#0ED3CF]/30 transition-colors"
      >
        <Quote className="h-5 w-5 text-[#0ED3CF] mb-3" aria-hidden />
        <blockquote className="text-[#F4F2EF] text-sm leading-relaxed mb-5">
          &ldquo;{r.quote}&rdquo;
        </blockquote>
        <figcaption className="flex items-center gap-3 pt-4 border-t border-[#2A2826]">
          <div
            className="h-9 w-9 rounded-md border border-[#2A2826] bg-[#0B0A09] flex items-center justify-center text-[11px] font-mono font-semibold text-[#0ED3CF] shrink-0"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#FAFAFA] truncate">
              {r.name}
            </div>
            <div className="text-xs text-[#A8A29E] truncate">
              {r.title}
              {r.company ? ` · ${r.company}` : ''}
            </div>
          </div>
        </figcaption>
      </motion.figure>
    )
  }

  // Anonymous reference card.
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="rounded-xl border border-[#2A2826] bg-[#12110F] p-6 hover:border-[#0ED3CF]/30 transition-colors flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-[#0ED3CF]" aria-hidden />
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
          Reference available
        </span>
      </div>
      <h3 className="font-semibold text-[#FAFAFA] mb-1">{r.role}</h3>
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#78716C] mb-3">
        {r.industry}
        {r.duration ? ` · ${r.duration}` : ''}
      </div>
      <p className="text-sm text-[#A8A29E] leading-relaxed flex-1">
        {r.context}
      </p>
      {r.callAvailable && (
        <div className="mt-4 pt-4 border-t border-[#2A2826] flex items-center gap-2 text-xs text-[#78716C]">
          <Phone className="h-3.5 w-3.5 text-[#0ED3CF]/70" aria-hidden />
          <span>Reference call shared during discovery, both consenting.</span>
        </div>
      )}
    </motion.div>
  )
}

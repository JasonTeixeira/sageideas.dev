'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import type { Testimonial } from '@/data/social-proof/testimonials'

const ADVANCE_MS = 6000

export function TestimonialCarousel({
  testimonials,
  className = '',
}: {
  testimonials: Testimonial[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const single = testimonials.length <= 1

  useEffect(() => {
    if (single || paused) return
    timer.current = setTimeout(() => {
      setIndex((i) => (i + 1) % testimonials.length)
    }, ADVANCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [index, paused, single, testimonials.length])

  if (testimonials.length === 0) return null

  const t = testimonials[index]

  const next = () => setIndex((i) => (i + 1) % testimonials.length)
  const prev = () =>
    setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)

  return (
    <div
      className={`relative rounded-2xl border border-[#2A2826] bg-[#12110F] p-8 sm:p-10 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Quote
        className="absolute top-6 left-6 w-8 h-8 text-[#0ED3CF]/30"
        aria-hidden
      />
      <div className="relative pl-12 min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <blockquote className="text-lg sm:text-xl text-[#FAFAFA] leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span className="text-sm font-semibold text-[#FAFAFA]">{t.name}</span>
              <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">
                {t.role} · {t.company}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {!single && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-[#0ED3CF]' : 'w-1.5 bg-[#3D3A37] hover:bg-[#57534E]'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={prev}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-[#2A2826] bg-[#1A1917] text-[#A8A29E] hover:text-[#FAFAFA] hover:border-[#3D3A37] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={next}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-[#2A2826] bg-[#1A1917] text-[#A8A29E] hover:text-[#FAFAFA] hover:border-[#3D3A37] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

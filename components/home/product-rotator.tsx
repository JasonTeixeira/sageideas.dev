'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'

export type RotatorItem = {
  src: string
  alt: string
  project: string
  url: string
}

interface ProductRotatorProps {
  items: RotatorItem[]
  /** ms between auto-advances; default 4000 */
  intervalMs?: number
}

export function ProductRotator({ items, intervalMs = 4000 }: ProductRotatorProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = items.length

  useEffect(() => {
    if (paused || total <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [paused, total, intervalMs])

  // Preload all rotator images so non-active slides don't flash blank on first display
  useEffect(() => {
    items.forEach((item) => {
      const img = new window.Image()
      img.src = item.src
    })
  }, [items])

  if (total === 0) return null
  const active = items[index]

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser chrome frame */}
      <div className="relative rounded-2xl overflow-hidden border border-[#2A2826] bg-[#1A1917] shadow-[0_24px_48px_-24px_rgba(6,182,212,0.25)]">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#12110F] border-b border-[#2A2826]">
          <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <span className="w-3 h-3 rounded-full bg-[#EAB308]" />
          <span className="w-3 h-3 rounded-full bg-[#22C55E]" />
          <div className="ml-3 flex-1 h-7 rounded-md bg-[#1A1917] border border-[#2A2826] flex items-center px-3">
            <span className="text-[11px] font-mono text-[#78716C] truncate">{active.url}</span>
          </div>
        </div>

        {/* Image stage */}
        <div className="relative aspect-[16/9] bg-[#0A0A0F]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <Image
                src={active.src}
                alt={active.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover"
                priority={index === 0}
              />
            </motion.div>
          </AnimatePresence>

          {/* Indicator dots */}
          {total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {items.map((it, i) => (
                <button
                  key={it.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${it.project}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-[#0ED3CF]' : 'w-1.5 bg-[#3D3A37] hover:bg-[#57534E]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Currently showing label */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#78716C]">
          Currently showing
        </div>
        <div className="text-sm text-[#FAFAFA] font-medium truncate">{active.project}</div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

interface ReadingProgressProps {
  targetSelector?: string
}

export function ReadingProgress({ targetSelector = '#article-body' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null
      if (!el) {
        setProgress(0)
        return
      }
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      if (total <= 0) {
        setProgress(scrolled > 0 ? 1 : 0)
        return
      }
      const ratio = Math.min(Math.max(scrolled / total, 0), 1)
      setProgress(ratio)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [targetSelector])

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-[60]"
    >
      <div
        className="h-full bg-[#0ED3CF] origin-left transition-transform duration-100"
        style={{ transform: `scaleX(${progress})`, transformOrigin: 'left' }}
      />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CarouselScreen = {
  src: string
  alt: string
  caption?: string
}

interface ScreensCarouselProps {
  screens: CarouselScreen[]
}

export function ScreensCarousel({ screens }: ScreensCarouselProps) {
  const [index, setIndex] = useState(0)
  const total = screens.length
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return
      const wrapped = ((next % total) + total) % total
      setIndex(wrapped)
    },
    [total],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX.current = null
  }

  if (total === 0) return null
  const active = screens[index]

  return (
    <div className="w-full">
      {/* Stage */}
      <div
        className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#2A2826] bg-[#12110F]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-roledescription="carousel"
        aria-label="Built UI screenshots"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={active.src}
              alt={active.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-contain"
              priority={index === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next chevrons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous screen"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full border border-[#3F3F46] bg-[#09090B]/70 text-[#FAFAFA] hover:bg-[#1A1917] hover:border-[#0ED3CF]/60 backdrop-blur-sm transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next screen"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full border border-[#3F3F46] bg-[#09090B]/70 text-[#FAFAFA] hover:bg-[#1A1917] hover:border-[#0ED3CF]/60 backdrop-blur-sm transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest bg-[#09090B]/80 text-[#A8A29E] border border-[#2A2826] backdrop-blur-sm">
          {index + 1} / {total}
        </div>
      </div>

      {/* Caption */}
      {active.caption && (
        <p className="mt-4 text-sm text-[#A8A29E] leading-relaxed max-w-3xl">{active.caption}</p>
      )}

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {screens.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show screen ${i + 1}`}
              aria-current={i === index}
              className={`relative shrink-0 w-32 aspect-video rounded-md overflow-hidden border transition-all duration-200 ${
                i === index
                  ? 'border-[#0ED3CF] ring-2 ring-[#0ED3CF]/40'
                  : 'border-[#2A2826] hover:border-[#3F3F46] opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={s.src}
                alt=""
                aria-hidden
                fill
                sizes="128px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

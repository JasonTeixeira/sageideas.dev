'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const sizeMap: Record<Size, string> = {
  sm: 'w-40 h-40',
  md: 'w-56 h-56',
  lg: 'w-72 h-72 lg:w-80 lg:h-80',
  xl: 'aspect-[4/5] w-full',
}

type Props = {
  size?: Size
  className?: string
  /** Show the cyan/violet duotone wash over the photo. Defaults to true. */
  duotone?: boolean
  /** Show the mono kicker frame around the photo. Defaults to true. */
  framed?: boolean
  /** Show small caption below the frame. Defaults to true. */
  caption?: boolean
  priority?: boolean
}

/**
 * Branded portrait of the founder. Cyan/violet duotone wash, subtle grain,
 * mono kicker frame. The photo desaturates slightly until hover so the brand
 * tone reads first and the human face reads on intent.
 */
export function FounderPortrait({
  size = 'lg',
  className,
  duotone = true,
  framed = true,
  caption = true,
  priority = false,
}: Props) {
  const dim = sizeMap[size]

  // For 'xl' the portrait is fluid and fills its parent's width.
  // For other sizes the wrapper hugs the fixed dimensions.
  const wrapperLayout = size === 'xl' ? 'block w-full' : 'inline-block'

  return (
    <div className={cn('relative', wrapperLayout, className)}>
      {framed && (
        <div className="absolute -top-3 -left-3 right-3 -bottom-3 border border-[#2A2826] rounded-3xl pointer-events-none" />
      )}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-[#12110F] border border-[#2A2826] group',
          dim,
        )}
      >
        <Image
          src="/images/headshot.jpg"
          alt="Jason Teixeira — Founder, Sage Ideas Studio"
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-all duration-700 group-hover:scale-[1.04] group-hover:saturate-100 saturate-[0.85]"
        />
        {duotone && (
          <>
            {/* Cyan wash from top-left */}
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-color pointer-events-none opacity-70 group-hover:opacity-30 transition-opacity duration-700"
              style={{
                background:
                  'radial-gradient(circle at 25% 20%, rgba(6,182,212,0.55), transparent 60%), radial-gradient(circle at 80% 90%, rgba(139,92,246,0.45), transparent 60%)',
              }}
            />
            {/* Bottom darken for legend */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#09090B]/80 via-[#09090B]/20 to-transparent pointer-events-none" />
            {/* Grain */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
            {/* Scanline */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
              }}
            />
          </>
        )}
      </div>
      {caption && (
        <div className="mt-4 flex items-center gap-3">
          <span className="block w-6 h-px bg-[#0ED3CF]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#78716C]">
            Founder · Principal Engineer
          </span>
        </div>
      )}
    </div>
  )
}

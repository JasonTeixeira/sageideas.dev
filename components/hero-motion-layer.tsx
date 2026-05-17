'use client'

import { motion } from 'framer-motion'

/**
 * Sage Ideas Hero Motion Layer
 *
 * Sits absolutely-positioned inside a `relative overflow-hidden` parent.
 * Brand-aligned layers:
 *   - slow-pan teal/coral radial washes (logo palette)
 *   - architectural dot grid (precision engineering feel)
 *   - film grain texture (editorial, premium)
 *   - subtle scanline (tech/terminal aesthetic)
 */
export function HeroMotionLayer({
  intensity = 'medium',
}: {
  intensity?: 'low' | 'medium' | 'high'
}) {
  const grainOpacity = intensity === 'low' ? 0.03 : intensity === 'high' ? 0.08 : 0.05
  const scanlineOpacity = intensity === 'low' ? 0.02 : intensity === 'high' ? 0.05 : 0.03

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Slow-pan sage teal wash */}
      <motion.div
        className="absolute -inset-[10%]"
        style={{
          background:
            'radial-gradient(ellipse at 25% 20%, rgba(14,211,207,0.10), transparent 55%)',
        }}
        animate={{ x: ['0%', '3%', '0%'], y: ['0%', '-2%', '0%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Slow-pan sage coral wash */}
      <motion.div
        className="absolute -inset-[10%]"
        style={{
          background:
            'radial-gradient(ellipse at 75% 75%, rgba(232,93,58,0.06), transparent 55%)',
        }}
        animate={{ x: ['0%', '-3%', '0%'], y: ['0%', '2%', '0%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Architectural dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(244,242,239,0.8) 0.5px, transparent 0.5px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Film grain */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: grainOpacity,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Terminal scanline — very subtle */}
      <div
        className="absolute inset-0"
        style={{
          opacity: scanlineOpacity,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(244,242,239,0.4) 0px, rgba(244,242,239,0.4) 1px, transparent 1px, transparent 4px)',
        }}
      />
    </div>
  )
}

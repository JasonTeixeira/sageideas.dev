'use client'

import { ReactNode, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: 'cyan' | 'coral' | 'violet' | 'gradient'
}

export function GlowCard({ children, className, glowColor = 'cyan' }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const glowColors = {
    cyan: 'rgba(14, 211, 207, 0.15)',
    coral: 'rgba(232, 93, 58, 0.15)',
    violet: 'rgba(199, 35, 110, 0.15)',
    gradient: 'rgba(14, 211, 207, 0.12)'
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative bg-[#1A1917] border border-[#2A2826] rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
        isHovered && 'border-[#0ED3CF]/50 shadow-[0_8px_32px_rgba(14,211,207,0.08)]',
        className
      )}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glow effect following cursor */}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColors[glowColor]}, transparent 40%)`
          }}
        />
      )}
      
      {/* Gradient border on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl transition-opacity duration-300',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          padding: '1px',
          background: glowColor === 'coral'
            ? 'linear-gradient(135deg, #E85D3A, transparent, #E85D3A)'
            : glowColor === 'violet'
            ? 'linear-gradient(135deg, #C7236E, transparent, #C7236E)'
            : 'linear-gradient(135deg, #0ED3CF, transparent, #E85D3A)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude'
        }}
      />
      
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

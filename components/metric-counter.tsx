'use client'

import { useEffect, useState, useRef } from 'react'
import { useInView, motion } from 'framer-motion'

interface MetricCounterProps {
  value: string
  label: string
}

export function MetricCounter({ value, label }: MetricCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  // SSR/a11y fix: render the FINAL value into the DOM by default so screen readers,
  // crawlers, and no-JS visitors never see a misleading "0". The animation is a
  // progressive enhancement that only runs once the element scrolls into view.
  const [displayValue, setDisplayValue] = useState(value)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (!isInView || hasAnimated) return

    // Respect reduced-motion users: don't animate, just hold the final value.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      setHasAnimated(true)
      return
    }

    // Extract number and suffix (e.g., "37+" -> 37, "+")
    const numMatch = value.match(/^[\$]?([\d,]+)/)
    const prefix = value.match(/^(\$)/) ? '$' : ''
    const suffix = value.replace(/^[\$]?[\d,]+/, '')

    if (!numMatch) {
      setDisplayValue(value)
      setHasAnimated(true)
      return
    }

    const targetNum = parseInt(numMatch[1].replace(/,/g, ''), 10)
    const duration = 1600
    const steps = 48
    const stepDuration = duration / steps
    // Start the count from a sensible floor so we never flash a literal "0".
    // We start the animation from ~30% of target — feels like a quick count-up
    // without ever showing 0 to anyone.
    let currentStep = Math.floor(steps * 0.3)

    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(targetNum * easeOut)
      setDisplayValue(prefix + currentValue.toLocaleString() + suffix)

      if (currentStep >= steps) {
        clearInterval(timer)
        setDisplayValue(value)
        setHasAnimated(true)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [isInView, value, hasAnimated])

  return (
    <motion.div
      ref={ref}
      className="text-center group"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative">
        <motion.div
          className="text-4xl sm:text-5xl font-bold text-[#FAFAFA] mb-2 font-mono"
          animate={hasAnimated ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {displayValue}
        </motion.div>
        {/* Subtle glow on complete */}
        {hasAnimated && (
          <motion.div
            className="absolute inset-0 bg-[#0ED3CF]/10 blur-xl rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.6 }}
          />
        )}
      </div>
      <div className="text-sm text-[#78716C] group-hover:text-[#A8A29E] transition-colors">
        {label}
      </div>
    </motion.div>
  )
}

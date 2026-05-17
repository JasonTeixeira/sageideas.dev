'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'

export function ReadingProgress() {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible) return null

  return (
    <motion.div
      className="fixed top-16 left-0 right-0 h-0.5 bg-[#2A2826] z-50 origin-left"
      style={{ scaleX: 0 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-[#0ED3CF] to-[#E85D3A] origin-left"
        style={{ scaleX }}
      />
    </motion.div>
  )
}

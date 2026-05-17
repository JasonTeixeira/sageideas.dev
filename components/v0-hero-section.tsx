'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Project {
  name: string
  url: string
  screenshot: string   // URL or /placeholder.svg
  accent: string       // accent dot color for the bottom strip
}

interface HeroSectionProps {
  logoMark?: React.ReactNode
  projects?: Project[]
}

/* ─────────────────────────────────────────────
   Default data
───────────────────────────────────────────── */
const DEFAULT_PROJECTS: Project[] = [
  {
    name: 'BillingFlow',
    url: 'billingflow.app',
    screenshot: '/placeholder.svg?height=420&width=680',
    accent: '#0ED3CF',
  },
  {
    name: 'AuditPilot',
    url: 'auditpilot.io',
    screenshot: '/placeholder.svg?height=420&width=680',
    accent: '#E85D3A',
  },
  {
    name: 'ContextKit',
    url: 'contextkit.dev',
    screenshot: '/placeholder.svg?height=420&width=680',
    accent: '#A8C633',
  },
  {
    name: 'NovaDeploy',
    url: 'novadeploy.sh',
    screenshot: '/placeholder.svg?height=420&width=680',
    accent: '#C7236E',
  },
]

const HEADLINE_LINES = [
  'I build AI systems.',
  'I ship them to production.',
  'I keep them healthy.',
]

/* ─────────────────────────────────────────────
   Typewriter hook
───────────────────────────────────────────── */
function useTypewriter(lines: string[], charDelay = 45, lineDelay = 700) {
  const [displayed, setDisplayed] = useState<string[]>([''])
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    if (lineIdx >= lines.length) {
      setDone(true)
      return
    }

    const currentLine = lines[lineIdx]

    if (charIdx < currentLine.length) {
      const t = setTimeout(() => {
        setDisplayed(prev => {
          const next = [...prev]
          next[lineIdx] = currentLine.slice(0, charIdx + 1)
          return next
        })
        setCharIdx(c => c + 1)
      }, charDelay)
      return () => clearTimeout(t)
    } else {
      // line complete – pause then move to next line
      const t = setTimeout(() => {
        if (lineIdx + 1 < lines.length) {
          setDisplayed(prev => [...prev, ''])
          setLineIdx(l => l + 1)
          setCharIdx(0)
        } else {
          setDone(true)
        }
      }, lineDelay)
      return () => clearTimeout(t)
    }
  }, [lineIdx, charIdx, done, lines, charDelay, lineDelay])

  return { displayed, done }
}

/* ─────────────────────────────────────────────
   Dot-grid SVG background
───────────────────────────────────────────── */
function DotGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dotgrid"
          x="0"
          y="0"
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="#0ED3CF" fillOpacity="0.03" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Ambient gradient blobs
───────────────────────────────────────────── */
function AmbientBlobs() {
  return (
    <>
      {/* teal – top-left */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-10%',
          left: '-5%',
          width: '55vw',
          height: '55vw',
          background:
            'radial-gradient(ellipse at center, rgba(14,211,207,0.13) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* coral – bottom-right */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%',
          right: '-5%',
          width: '50vw',
          height: '50vw',
          background:
            'radial-gradient(ellipse at center, rgba(232,93,58,0.11) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, -25, 20, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* magenta – mid */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '30%',
          left: '40%',
          width: '30vw',
          height: '30vw',
          background:
            'radial-gradient(ellipse at center, rgba(199,35,110,0.07) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }}
        animate={{ x: [0, 15, -15, 0], y: [0, -15, 15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  )
}

/* ─────────────────────────────────────────────
   Default logo mark
───────────────────────────────────────────── */
function DefaultLogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect width="20" height="20" rx="4" fill="#0ED3CF" fillOpacity="0.15" />
      <path
        d="M10 3 L14.33 7 L14.33 13 L10 17 L5.67 13 L5.67 7 Z"
        stroke="#0ED3CF"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2" fill="#0ED3CF" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Browser chrome wrapper
───────────────────────────────────────────── */
function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: '#18181C',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow:
          '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ height: 40, background: '#111113', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
        </div>
        {/* Address bar */}
        <div
          className="flex-1 mx-4 flex items-center justify-center rounded-md"
          style={{
            height: 24,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{ fontSize: 11, color: '#A8A29E', fontFamily: 'monospace' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d="M5 1a4 4 0 100 8A4 4 0 005 1zM1 5h8M5 1C3.8 2.4 3.2 3.7 3.2 5s.6 2.6 1.8 4M5 1c1.2 1.4 1.8 2.7 1.8 4S6.2 7.6 5 9"
                stroke="#A8A29E"
                strokeWidth="0.8"
              />
            </svg>
            <span>https://</span>
          </div>
        </div>
      </div>
      {/* Content */}
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Product Showcase (right column)
───────────────────────────────────────────── */
function ProductShowcase({ projects }: { projects: Project[] }) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setPrev(current)
      setCurrent(c => (c + 1) % projects.length)
    }, 4000)
    return () => clearInterval(id)
  }, [current, projects.length])

  const project = projects[current]

  return (
    <div className="flex flex-col gap-5 w-full">
      <BrowserFrame>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/10' }}>
          <AnimatePresence mode="sync">
            <motion.img
              key={current}
              src={project.screenshot}
              alt={`Screenshot of ${project.name}`}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{ objectPosition: 'top left' }}
            />
          </AnimatePresence>

          {/* Subtle vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent 60%, rgba(9,9,11,0.5) 100%)',
            }}
          />
        </div>
      </BrowserFrame>

      {/* Project meta + dots */}
      <div className="flex items-center justify-between px-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-0.5"
          >
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: '#F4F2EF' }}
            >
              {project.name}
            </span>
            <span
              className="font-mono text-xs"
              style={{ color: '#A8A29E' }}
            >
              {project.url}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {projects.map((p, i) => (
            <button
              key={i}
              aria-label={`Go to ${p.name}`}
              onClick={() => {
                setPrev(current)
                setCurrent(i)
              }}
              className="transition-all duration-300 rounded-full cursor-pointer"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background: i === current ? p.accent : 'rgba(168,162,158,0.35)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Thin accent line at current project color */}
      <motion.div
        key={current + '-line'}
        className="h-px w-full rounded-full"
        style={{ background: project.accent, opacity: 0.4 }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Trust strip
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  { label: '9 certifications',  color: '#0ED3CF' },
  { label: '106 repos',         color: '#A8C633' },
  { label: '1,438 commits',     color: '#E85D3A' },
  { label: '6 live products',   color: '#C7236E' },
]

function TrustStrip() {
  return (
    <motion.div
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.5, duration: 0.6 }}
    >
      {TRUST_ITEMS.map((item, i) => (
        <span key={i} className="flex items-center gap-2 font-mono text-xs" style={{ color: '#A8A29E' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          {item.label}
          {i < TRUST_ITEMS.length - 1 && (
            <span className="ml-1 opacity-25" style={{ color: '#A8A29E' }}>·</span>
          )}
        </span>
      ))}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export default function HeroSection({
  logoMark,
  projects = DEFAULT_PROJECTS,
}: HeroSectionProps) {
  const { displayed, done } = useTypewriter(HEADLINE_LINES, 42, 600)

  return (
    <section
      className="film-grain relative min-h-screen w-full flex flex-col overflow-hidden"
      style={{ background: '#09090B' }}
      aria-label="Hero"
    >
      {/* ── Layered backgrounds ── */}
      <DotGrid />
      <AmbientBlobs />

      {/* ── Content grid ── */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-24 lg:py-0">
          <div className="grid lg:grid-cols-[60fr_40fr] gap-12 xl:gap-20 items-center min-h-screen">

            {/* ── LEFT COLUMN ── */}
            <div className="flex flex-col gap-8 lg:py-24">

              {/* Label */}
              <motion.div
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                  style={{
                    background: 'rgba(14,211,207,0.10)',
                    border: '1px solid rgba(14,211,207,0.20)',
                  }}
                >
                  {logoMark ?? <DefaultLogoMark />}
                </span>
                <span
                  className="font-mono text-xs tracking-widest uppercase"
                  style={{ color: '#0ED3CF', letterSpacing: '0.16em' }}
                >
                  Sage Ideas&nbsp;&nbsp;·&nbsp;&nbsp;Studio
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider"
                  style={{
                    background: 'rgba(168,198,51,0.10)',
                    border: '1px solid rgba(168,198,51,0.25)',
                    color: '#A8C633',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Available
                </span>
              </motion.div>

              {/* Headline */}
              <div className="flex flex-col gap-1" aria-label="Main headline">
                {HEADLINE_LINES.map((line, i) => (
                  <motion.h1
                    key={i}
                    className="font-serif leading-tight text-balance"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: 'clamp(2.1rem, 4.2vw, 3.75rem)',
                      color: '#F4F2EF',
                      fontWeight: 400,
                      minHeight: '1.2em',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: displayed.length > i ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {displayed[i] ?? ''}
                    {/* blinking cursor – only on the active line */}
                    {i === displayed.length - 1 && !done && (
                      <span
                        className="cursor-blink inline-block ml-0.5 align-baseline"
                        style={{
                          width: 3,
                          height: '0.85em',
                          background: '#0ED3CF',
                          borderRadius: 1,
                          verticalAlign: 'middle',
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </motion.h1>
                ))}
              </div>

              {/* Subtitle */}
              <motion.p
                className="text-base md:text-lg leading-relaxed max-w-[42ch]"
                style={{ color: '#A8A29E' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.8, duration: 0.7 }}
              >
                Sage Ideas is a one-person studio for founders who need it built
                right the first time.{' '}
                <span style={{ color: '#F4F2EF' }}>Full-stack, AI-native, billing-grade.</span>
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-wrap gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.1, duration: 0.6 }}
              >
                {/* Primary */}
                <motion.a
                  href="#"
                  className="relative inline-flex items-center gap-2.5 px-6 py-3 rounded-lg font-medium text-sm transition-transform"
                  style={{
                    background: '#0ED3CF',
                    color: '#09090B',
                    boxShadow: '0 0 28px rgba(14,211,207,0.35), 0 0 60px rgba(14,211,207,0.12)',
                    fontWeight: 600,
                  }}
                  whileHover={{ scale: 1.025, boxShadow: '0 0 36px rgba(14,211,207,0.55), 0 0 80px rgba(14,211,207,0.18)' }}
                  whileTap={{ scale: 0.975 }}
                  aria-label="Book a Discovery Call"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Book a Discovery Call
                </motion.a>

                {/* Secondary */}
                <motion.a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors"
                  style={{
                    color: '#F4F2EF',
                    background: 'transparent',
                    border: '1px solid rgba(244,242,239,0.18)',
                  }}
                  whileHover={{
                    background: 'rgba(244,242,239,0.06)',
                    borderColor: 'rgba(244,242,239,0.35)',
                  }}
                  whileTap={{ scale: 0.975 }}
                  aria-label="See Our Work"
                >
                  See Our Work
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 9.5l7-7M9.5 9.5V2.5H2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.a>
              </motion.div>

              {/* Trust strip */}
              <TrustStrip />
            </div>

            {/* ── RIGHT COLUMN ── */}
            <motion.div
              className="hidden lg:flex flex-col gap-4 lg:py-24"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductShowcase projects={projects} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Bottom scroll hint ── */}
      <motion.div
        className="relative z-10 flex justify-center pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4, duration: 0.8 }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: '#A8A29E', opacity: 0.5 }}>
            Scroll
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 5l4 4 4-4" stroke="#A8A29E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}

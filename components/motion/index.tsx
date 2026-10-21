'use client'

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion'
import { usePathname } from 'next/navigation'
import {
  Children,
  ReactNode,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react'

// =============================================================
// FadeIn
// =============================================================
interface FadeInProps {
  children: ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
  once?: boolean
}

export function FadeIn({
  children,
  delay = 0,
  y = 16,
  duration = 0.5,
  className,
  once = true,
}: FadeInProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-50px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================
// Stagger / StaggerItem
// =============================================================
interface StaggerProps {
  children: ReactNode
  gap?: number
  delay?: number
  className?: string
  as?: 'div' | 'ul' | 'ol' | 'section'
}

export function Stagger({
  children,
  gap = 0.06,
  delay = 0,
  className,
  as = 'div',
}: StaggerProps) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as] as typeof motion.div
  if (reduced) {
    const Tag = as as 'div'
    return <Tag className={className}>{children}</Tag>
  }
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: gap, delayChildren: delay },
        },
      }}
    >
      {children}
    </MotionTag>
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
  y?: number
}

export function StaggerItem({ children, className, y = 16 }: StaggerItemProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: 'easeOut' },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================
// CountUp
// =============================================================
interface CountUpProps {
  from?: number
  to: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
  className?: string
}

export function CountUp({
  from = 0,
  to,
  suffix = '',
  prefix = '',
  duration = 1.2,
  decimals = 0,
  className,
}: CountUpProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState<number>(reduced ? to : from)
  const [hasRun, setHasRun] = useState(false)

  useEffect(() => {
    if (reduced) {

      setDisplay(to)
      return
    }
    if (hasRun) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasRun(true)
            const start = performance.now()
            const animate = (now: number) => {
              const elapsed = (now - start) / 1000
              const t = Math.min(elapsed / duration, 1)
              const eased = 1 - Math.pow(1 - t, 3)
              const current = from + (to - from) * eased
              setDisplay(current)
              if (t < 1) requestAnimationFrame(animate)
              else setDisplay(to)
            }
            requestAnimationFrame(animate)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [from, to, duration, reduced, hasRun])

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

// =============================================================
// TypewriterLines
// =============================================================
interface TypewriterLinesProps {
  lines: string[]
  speed?: number
  cursorChar?: string
  className?: string
  lineClassName?: string
  startDelay?: number
}

export function TypewriterLines({
  lines,
  speed = 45,
  cursorChar = '▌',
  className,
  lineClassName,
  startDelay = 250,
}: TypewriterLinesProps) {
  const reduced = useReducedMotion()
  const [rendered, setRendered] = useState<string[]>(reduced ? lines : [])
  const [, setActiveChar] = useState(0)
  const [activeLine, setActiveLine] = useState(0)
  const [cursorOn, setCursorOn] = useState(true)
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      setRendered(lines)
      setDone(true)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const start = setTimeout(() => {
      const tick = () => {
        if (cancelled) return
        setActiveLine((curLine) => {
          if (curLine >= lines.length) {
            setDone(true)
            return curLine
          }
          const target = lines[curLine]
          setActiveChar((curChar) => {
            if (curChar < target.length) {
              const next = curChar + 1
              setRendered((prev) => {
                const copy = [...prev]
                copy[curLine] = target.slice(0, next)
                return copy
              })
              timer = setTimeout(tick, speed)
              return next
            } else {
              timer = setTimeout(() => {
                setActiveLine((l) => l + 1)
                setActiveChar(0)
                tick()
              }, 380)
              return curChar
            }
          })
          return curLine
        })
      }
      tick()
    }, startDelay)

    return () => {
      cancelled = true
      clearTimeout(start)
      clearTimeout(timer!)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setCursorOn((v) => !v), 520)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const text = rendered[i] ?? ''
        const showCursor = !done && i === activeLine
        return (
          <div key={i} className={lineClassName}>
            {text}
            {showCursor && (
              <span
                aria-hidden
                className="inline-block ml-0.5 text-[#3D5AFE]"
                style={{ opacity: cursorOn ? 1 : 0 }}
              >
                {cursorChar}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// =============================================================
// HoverGlow
// =============================================================
interface HoverGlowProps {
  children: ReactNode
  className?: string
  color?: string
  size?: number
}

export function HoverGlow({
  children,
  className = '',
  color = 'rgba(61,90,254,0.18)',
  size = 380,
}: HoverGlowProps) {
  const reduced = useReducedMotion()
  const x = useMotionValue(-1000)
  const y = useMotionValue(-1000)
  const [active, setActive] = useState(false)

  if (reduced) return <div className={className}>{children}</div>

  return (
    <div
      className={`relative ${className}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left)
        y.set(e.clientY - rect.top)
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(${size}px circle at var(--mx) var(--my), ${color}, transparent 70%)`,
          // @ts-expect-error CSS vars
          '--mx': x,
          '--my': y,
        }}
      />
      {children}
    </div>
  )
}

// =============================================================
// PageReveal
// =============================================================
export function PageReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================
// PageTransition (route-keyed)
// =============================================================
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [label, setLabel] = useState('Index')

  useEffect(() => {
    if (!pathname) return
    const next =
      pathname === '/'
        ? 'Index'
        : pathname
            .split('/')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) =>
              part
                .split('-')
                .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
                .join(' '),
            )
            .join(' / ')
    setLabel(next)
  }, [pathname])

  return (
    <div className="relative isolate">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`route-overlay-${pathname}`}
          className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-[100svh] overflow-hidden"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.72, times: [0, 0.12, 0.72, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute left-0 top-0 h-px bg-[linear-gradient(90deg,#3D5AFE,#7C3AED,#FF2D9B)]"
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '62%', '100%'] }}
            transition={{ duration: 0.66, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute left-0 top-0 h-full w-[34vw] border-r border-[rgba(242,239,233,0.08)] bg-[rgba(11,11,14,0.74)] backdrop-blur-md"
            initial={{ x: '-105%' }}
            animate={{ x: ['-105%', '0%', '105%'] }}
            transition={{ duration: 0.74, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-[26vw] border-l border-[rgba(242,239,233,0.07)] bg-[rgba(20,20,24,0.62)] backdrop-blur-md"
            initial={{ x: '105%' }}
            animate={{ x: ['105%', '0%', '-105%'] }}
            transition={{ duration: 0.74, delay: 0.03, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute right-5 top-24 hidden rounded-full border border-[rgba(242,239,233,0.12)] bg-[rgba(11,11,14,0.7)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--sage-ink-muted)] backdrop-blur-md [font-family:var(--font-mono),ui-monospace,monospace] md:block"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-6, 0, 0, -3] }}
            transition={{ duration: 0.7, times: [0, 0.18, 0.74, 1], ease: 'easeOut' }}
          >
            Routing / {label}
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Convenience: assert children are valid for tooling
export function _assertChildren(children: ReactNode) {
  return Children.toArray(children).every(isValidElement)
}

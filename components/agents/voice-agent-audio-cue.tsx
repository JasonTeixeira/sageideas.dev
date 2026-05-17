'use client'

/**
 * Synthesized "sample call" UI for the Voice Agent flagship page.
 *
 * No real audio file ships. Pressing Play steps through a scripted transcript
 * and animates a CSS waveform visualization for the active speaker. This sets
 * accurate expectations (you see the SHAPE of a call, not a stylized demo with
 * actor voices) while still being engaging.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Pause, Play, RotateCcw, User2, Bot } from 'lucide-react'

type Line = {
  speaker: 'caller' | 'agent'
  text: string
  /** Duration of this line in seconds (used to advance the timeline) */
  seconds: number
}

const SCRIPT: Line[] = [
  { speaker: 'agent', text: 'Hi, thanks for calling Riverbend Dental \u2014 this is the front desk assistant. How can I help?', seconds: 4 },
  { speaker: 'caller', text: 'Hey, I need to book a cleaning sometime next week.', seconds: 3 },
  { speaker: 'agent', text: 'Happy to help. Are mornings or afternoons better for you?', seconds: 3 },
  { speaker: 'caller', text: 'Mornings. And before Wednesday if possible.', seconds: 3 },
  { speaker: 'agent', text: 'I have Tuesday at 9:15 with Dr. Patel. Want me to book it?', seconds: 3 },
  { speaker: 'caller', text: 'Wait \u2014 are you a real person?', seconds: 2 },
  { speaker: 'agent', text: 'I\u2019m an AI assistant. I can book you in now, or transfer you to our front-desk team if you prefer a person.', seconds: 4 },
  { speaker: 'caller', text: 'No, you\u2019re fine. Book Tuesday at 9:15.', seconds: 3 },
  { speaker: 'agent', text: 'Booked. You\u2019ll get a text confirmation in a minute. Anything else?', seconds: 3 },
]

const TOTAL_SEC = SCRIPT.reduce((s, l) => s + l.seconds, 0)

type Props = {
  accent?: string
  title?: string
  subtitle?: string
}

export function VoiceAgentAudioCue({
  accent = '#A78BFA',
  title = 'Sample call \u2014 inbound booking',
  subtitle = 'Synthesized for clarity. Real deployments use your business name, hours, and approved scripts.',
}: Props) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing) {
      if (tickRef.current) clearInterval(tickRef.current)
      tickRef.current = null
      return
    }
    tickRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.1
        if (next >= TOTAL_SEC) {
          setPlaying(false)
          return TOTAL_SEC
        }
        return next
      })
    }, 100)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [playing])

  // Determine which line is "now"
  let acc = 0
  let activeIdx = -1
  for (let i = 0; i < SCRIPT.length; i++) {
    if (elapsed < acc + SCRIPT[i].seconds) {
      activeIdx = i
      break
    }
    acc += SCRIPT[i].seconds
  }
  if (activeIdx === -1 && elapsed >= TOTAL_SEC) activeIdx = SCRIPT.length - 1
  const activeSpeaker = activeIdx >= 0 ? SCRIPT[activeIdx].speaker : null
  const visibleLines = SCRIPT.slice(0, Math.max(activeIdx + 1, 0))

  function togglePlay() {
    if (elapsed >= TOTAL_SEC) {
      setElapsed(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  function reset() {
    setPlaying(false)
    setElapsed(0)
  }

  const progressPct = Math.min(100, (elapsed / TOTAL_SEC) * 100)
  const elapsedLabel = formatTime(elapsed)
  const totalLabel = formatTime(TOTAL_SEC)

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0B0F] to-[#0F1014] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            <Phone className="w-3.5 h-3.5" style={{ color: accent }} />
            Voice Agent demo
          </div>
          <h3 className="mt-2 text-xl font-semibold text-[#FAFAFA]">{title}</h3>
          <p className="mt-1.5 text-sm text-[#A8A29E] max-w-xl">{subtitle}</p>
        </div>
      </div>

      {/* Waveform + controls bar */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-4 sm:p-5 mb-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: accent,
              color: '#09090B',
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 translate-x-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <Waveform active={playing} accent={accent} speaker={activeSpeaker} />
            <div className="mt-2 flex items-center justify-between text-[10.5px] font-mono text-[#78716C]">
              <span>{elapsedLabel}</span>
              <span>{totalLabel}</span>
            </div>
            <div className="mt-1 h-0.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accent}, #34D399)`,
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="shrink-0 w-9 h-9 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-[#A8A29E] hover:text-[#FAFAFA] transition-colors"
            aria-label="Reset"
            disabled={elapsed === 0 && !playing}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div className="rounded-xl border border-white/10 bg-black/30">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#A8A29E]">
            Transcript
          </span>
          <span className="text-[10px] font-mono text-[#57534E]">
            {visibleLines.length} / {SCRIPT.length}
          </span>
        </div>
        <ul className="divide-y divide-white/5 min-h-[200px]">
          <AnimatePresence initial={false}>
            {visibleLines.map((line, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 px-4 py-3 ${
                  i === activeIdx ? 'bg-white/[0.02]' : ''
                }`}
              >
                <div
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:
                      line.speaker === 'agent'
                        ? `${accent}22`
                        : 'rgba(255,255,255,0.06)',
                    color:
                      line.speaker === 'agent' ? accent : '#A8A29E',
                  }}
                >
                  {line.speaker === 'agent' ? (
                    <Bot className="w-3.5 h-3.5" />
                  ) : (
                    <User2 className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-0.5">
                    {line.speaker === 'agent' ? 'Agent' : 'Caller'}
                  </div>
                  <div className="text-[13.5px] text-[#D4D4D8] leading-snug">
                    {line.text}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <p className="mt-4 text-[11.5px] text-[#78716C]">
        Notice line 6 \u2014 if a caller asks &ldquo;are you a real person?&rdquo;,
        the agent identifies as AI and offers a transfer. That guardrail ships
        on every voice deployment.
      </p>
    </div>
  )
}

function Waveform({
  active,
  accent,
  speaker,
}: {
  active: boolean
  accent: string
  speaker: 'caller' | 'agent' | null
}) {
  // Pseudo-random but deterministic bar heights (stable on SSR/hydration)
  const bars = WAVE_BARS
  return (
    <div className="flex items-center gap-[3px] h-12" aria-hidden>
      {bars.map((h, i) => {
        const isAgent = speaker === 'agent'
        const isCaller = speaker === 'caller'
        const color = isAgent ? accent : isCaller ? '#FAFAFA' : '#3D3A37'
        const animate = active && speaker !== null
        return (
          <motion.span
            key={i}
            className="block w-[3px] rounded-full"
            style={{
              backgroundColor: color,
              opacity: speaker ? 0.85 : 0.35,
            }}
            animate={
              animate
                ? {
                    scaleY: [h, h * 0.4, h * 0.9, h * 0.55, h],
                  }
                : { scaleY: h }
            }
            transition={
              animate
                ? {
                    duration: 0.9 + (i % 5) * 0.08,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : { duration: 0.3 }
            }
          />
        )
      })}
    </div>
  )
}

// Stable bar pattern (sine-modulated) for the waveform
const WAVE_BARS = Array.from({ length: 64 }, (_, i) => {
  const v =
    0.35 +
    0.5 * Math.abs(Math.sin(i * 0.42)) +
    0.15 * Math.abs(Math.sin(i * 1.17 + 1.3))
  return Math.min(1, v)
})

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

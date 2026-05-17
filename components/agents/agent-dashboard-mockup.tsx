'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  DollarSign,
  Gauge,
  ShieldCheck,
} from 'lucide-react'

export type DashboardActivity = {
  /** Time tag like "2m" or "12s" */
  t: string
  text: string
  status?: 'ok' | 'warn' | 'error' | 'pending'
}

export type DashboardKPI = {
  label: string
  value: string
  delta?: string
  good?: boolean
}

type Props = {
  title?: string
  subtitle?: string
  /** Top-row KPI tiles (4 max recommended) */
  kpis: DashboardKPI[]
  /** Live activity feed entries */
  activity: DashboardActivity[]
  /** Eval pass rate 0-100 */
  evalPct?: number
  /** Spend $/month so far */
  spendUsed?: string
  spendCap?: string
  /** Approval-queue label and count */
  pendingApprovals?: number
  accent?: string
  /** Optional pool of synthetic events the ticker rotates through every ~4s */
  liveTickerPool?: DashboardActivity[]
}

const STATUS_DOT: Record<NonNullable<DashboardActivity['status']>, string> = {
  ok: '#34D399',
  warn: '#F59E0B',
  error: '#F87171',
  pending: '#78716C',
}

export function AgentDashboardMockup({
  title = 'Agent Command Center',
  subtitle = 'What your dashboard looks like in production.',
  kpis,
  activity,
  evalPct = 96,
  spendUsed = '$182',
  spendCap = '$500',
  pendingApprovals = 3,
  accent = '#22D3EE',
  liveTickerPool,
}: Props) {
  const [feed, setFeed] = useState<DashboardActivity[]>(activity)
  const [isLive, setIsLive] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const poolRef = useRef(liveTickerPool ?? [])

  // Pause/play the ticker based on viewport visibility (perf + battery friendly)
  useEffect(() => {
    if (!containerRef.current || poolRef.current.length === 0) return
    const el = containerRef.current
    const obs = new IntersectionObserver(
      ([entry]) => setIsLive(entry.isIntersecting),
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!isLive || poolRef.current.length === 0) return
    let i = 0
    const id = setInterval(() => {
      const next = poolRef.current[i % poolRef.current.length]
      i += 1
      setFeed((prev) => [{ ...next, t: 'now' }, ...prev].slice(0, 6))
    }, 4000)
    return () => clearInterval(id)
  }, [isLive])

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0B0F] to-[#0F1014] p-5 sm:p-7"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            <CircleDot className="w-3 h-3 text-emerald-400 animate-pulse" />
            Live · Production
          </div>
          <h3 className="mt-1.5 text-lg font-semibold text-[#FAFAFA]">{title}</h3>
          <p className="mt-1 text-sm text-[#A8A29E]">{subtitle}</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#78716C]">
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
            agent.v1.4
          </span>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-xl border border-white/10 bg-black/30 p-4"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              {k.label}
            </div>
            <div className="mt-1.5 text-xl font-semibold text-[#FAFAFA]">
              {k.value}
            </div>
            {k.delta && (
              <div
                className="mt-1 text-[11px] font-mono"
                style={{ color: k.good === false ? '#F87171' : '#34D399' }}
              >
                {k.delta}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 3-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Activity feed */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-black/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#A8A29E]">
              <Activity className="w-3.5 h-3.5" style={{ color: accent }} />
              Live activity
            </div>
            <span className="text-[10px] font-mono text-[#57534E]">
              last 5 min
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
            {feed.map((a, i) => (
              <motion.li
                key={`${a.t}-${a.text}-${i}`}
                layout
                initial={{ opacity: 0, x: -8, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 px-4 py-2.5"
              >
                <span
                  className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: STATUS_DOT[a.status ?? 'ok'],
                  }}
                />
                <span className="text-[10px] font-mono text-[#57534E] w-8 shrink-0 mt-0.5">
                  {a.t}
                </span>
                <span className="text-[12.5px] text-[#D4D4D8] leading-snug">
                  {a.text}
                </span>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        </div>

        {/* Right column: Eval, Spend, Approvals */}
        <div className="space-y-3">
          {/* Eval gauge */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3 h-3" style={{ color: accent }} />
                Eval pass rate
              </span>
              <span className="text-[#34D399]">{evalPct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${evalPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${accent}, #34D399)`,
                }}
              />
            </div>
            <div className="mt-2 text-[10.5px] text-[#78716C]">
              42 / 44 test cases passed · last run 12m ago
            </div>
          </div>

          {/* Spend cap */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-amber-400" />
                Monthly spend
              </span>
              <span className="text-[#A8A29E]">
                {spendUsed} <span className="text-[#57534E]">/ {spendCap}</span>
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '36%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-amber-400/80"
              />
            </div>
            <div className="mt-2 text-[10.5px] text-[#78716C]">
              Auto-pause at cap. Slack alert at 80%.
            </div>
          </div>

          {/* Approvals */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-pink-400" />
                Awaiting approval
              </span>
              <span className="text-[#F472B6] font-semibold">
                {pendingApprovals}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11.5px] text-[#D4D4D8]">
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                Refund request &gt; $250 — review
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                Outbound email batch — 12 ready
              </li>
              <li className="flex items-center gap-2 text-[#78716C]">
                <CircleDot className="w-3 h-3 shrink-0" />1 more queued
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

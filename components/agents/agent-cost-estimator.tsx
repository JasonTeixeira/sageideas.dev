'use client'

import { useEffect, useState } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { Calculator, Info, ShieldCheck, BellRing } from 'lucide-react'

type Props = {
  /** Unit name shown next to the slider, e.g. "conversations / mo" */
  unitLabel: string
  /** Min slider value */
  min: number
  /** Max slider value */
  max: number
  /** Step size */
  step: number
  /** Default value */
  defaultValue: number
  /** Cost per unit in USD */
  costPerUnit: number
  /** Fixed monthly base cost (infra, hosting, observability) */
  baseCost?: number
  /** Title above the calculator */
  title?: string
  /** Subtitle/explainer */
  subtitle?: string
  accent?: string
}

function formatNumber(n: number) {
  return n.toLocaleString('en-US')
}

function formatUSD(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function AgentCostEstimator({
  unitLabel,
  min,
  max,
  step,
  defaultValue,
  costPerUnit,
  baseCost = 0,
  title = 'Forecast your monthly run cost',
  subtitle = 'Honest math. No surprise bills. Cap is enforced in production.',
  accent = '#22D3EE',
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const variableCost = value * costPerUnit
  const total = baseCost + variableCost
  const pct = ((value - min) / (max - min)) * 100

  // Animated total counter
  const totalMV = useMotionValue(total)
  const totalRounded = useTransform(totalMV, (v) =>
    `$${Math.round(v).toLocaleString('en-US')}`
  )
  useEffect(() => {
    const controls = animate(totalMV, total, {
      duration: 0.4,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [total, totalMV])

  // Suggested cap = 1.5x current total (rounded up to nearest $50)
  const suggestedCap = Math.ceil((total * 1.5) / 50) * 50

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0B0F] to-[#0F1014] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            <Calculator className="w-3.5 h-3.5" style={{ color: accent }} />
            Cost estimator
          </div>
          <h3 className="mt-2 text-xl font-semibold text-[#FAFAFA]">{title}</h3>
          <p className="mt-1.5 text-sm text-[#A8A29E] max-w-xl">{subtitle}</p>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[12px] text-[#A8A29E]">
          <span className="font-mono uppercase tracking-widest text-[10px] text-[#78716C]">
            Volume
          </span>
          <span className="text-[#FAFAFA] font-semibold">
            {formatNumber(value)}{' '}
            <span className="text-[#78716C] font-normal">{unitLabel}</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={`Volume in ${unitLabel}`}
            className="w-full h-2 rounded-full appearance-none bg-white/10 outline-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-grab"
            style={{
              background: `linear-gradient(90deg, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
            }}
          />
          <div className="flex justify-between text-[10px] font-mono text-[#57534E] mt-1.5">
            <span>{formatNumber(min)}</span>
            <span>{formatNumber(max)}</span>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            Base infra
          </div>
          <div className="mt-1 text-lg font-semibold text-[#A8A29E]">
            {formatUSD(baseCost)}
            <span className="text-[11px] text-[#57534E] font-normal"> / mo</span>
          </div>
          <div className="mt-1 text-[10.5px] text-[#78716C]">
            Hosting · observability · evals
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            Variable (LLM + tools)
          </div>
          <div className="mt-1 text-lg font-semibold text-[#A8A29E]">
            {formatUSD(variableCost)}
            <span className="text-[11px] text-[#57534E] font-normal"> / mo</span>
          </div>
          <div className="mt-1 text-[10.5px] text-[#78716C]">
            ≈ ${costPerUnit.toFixed(2)} per {unitLabel.split(' ')[0]}
          </div>
        </div>

        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border p-4"
          style={{
            borderColor: `${accent}55`,
            background: `linear-gradient(135deg, ${accent}1A, transparent)`,
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            Total monthly
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: '#FAFAFA' }}>
            <motion.span>{totalRounded}</motion.span>
            <span className="text-[11px] text-[#78716C] font-normal"> / mo</span>
          </div>
          <div className="mt-1 text-[10.5px] text-[#78716C]">
            Forecast — actual capped in prod
          </div>
        </motion.div>
      </div>

      {/* Cap callout */}
      <div
        className="mt-4 rounded-xl border p-3.5 flex items-start gap-3"
        style={{
          borderColor: `${accent}33`,
          backgroundColor: `${accent}0A`,
        }}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accent }} />
        <div className="flex-1 text-[12px] text-[#A8A29E] leading-snug">
          <span className="text-[#FAFAFA] font-semibold">
            Recommended monthly cap: {formatUSD(suggestedCap)}
          </span>{' '}
          — we set this hard ceiling in production. Agent auto-pauses when hit, with a Slack
          alert at 80%. You raise it only if you want to.
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
          <BellRing className="w-3 h-3" />
          80% alert
        </span>
      </div>

      <div className="mt-5 flex items-start gap-2 text-[11.5px] text-[#78716C]">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Estimate uses average token costs and observed agent behavior in similar
          deployments. Final budget is set with you during scoping and enforced
          with a hard monthly cap. BYOK supported — pay your provider directly,
          we don&apos;t mark up tokens.
        </span>
      </div>
    </div>
  )
}

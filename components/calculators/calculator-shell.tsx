'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Props = {
  title: string
  subtitle: string
  inputs: ReactNode
  results: { label: string; value: string; emphasis?: boolean }[]
  ctaSlug: string
  ctaLabel?: string
  footnote?: string
}

export function CalculatorShell({
  title,
  subtitle,
  inputs,
  results,
  ctaSlug,
  ctaLabel = 'Talk to Sage',
  footnote,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 sm:p-8">
      <header className="mb-6">
        <h3 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-[#A8A29E]">{subtitle}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">{inputs}</div>

        {/* Results */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[#2A2826] bg-[#09090B] p-5">
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4">
                  <span
                    className={`text-sm ${
                      r.emphasis ? 'text-[#FAFAFA] font-medium' : 'text-[#A8A29E]'
                    }`}
                  >
                    {r.label}
                  </span>
                  <span
                    className={`tabular-nums font-mono ${
                      r.emphasis
                        ? 'text-2xl text-[#0ED3CF] font-bold'
                        : 'text-base text-[#FAFAFA]'
                    }`}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {footnote && (
            <p className="text-xs text-[#57534E] leading-relaxed">{footnote}</p>
          )}

          <Link
            href={`/contact?engagement=${ctaSlug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0ED3CF] px-5 py-3 text-sm font-medium text-[#09090B] transition-all hover:bg-[#0AA8A5]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Reusable input components
type RangeProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  format?: (n: number) => string
  onChange: (n: number) => void
}

export function RangeInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  format,
  onChange,
}: RangeProps) {
  const display = format ? format(value) : `${value.toLocaleString()}${unit}`
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm text-[#A8A29E]">{label}</label>
        <span className="text-sm font-mono tabular-nums text-[#FAFAFA]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#0ED3CF]"
      />
    </div>
  )
}

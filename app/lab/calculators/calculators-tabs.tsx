'use client'

import { useState } from 'react'
import { SdrCalculator } from '@/components/calculators/sdr-calculator'
import { SupportCalculator } from '@/components/calculators/support-calculator'
import { RagCalculator } from '@/components/calculators/rag-calculator'
import { VoiceCalculator } from '@/components/calculators/voice-calculator'
import { ChurnCalculator } from '@/components/calculators/churn-calculator'

const tabs = [
  { id: 'sdr', label: 'AI SDR' },
  { id: 'support', label: 'Support agent' },
  { id: 'rag', label: 'RAG / knowledge' },
  { id: 'voice', label: 'Voice agent' },
  { id: 'churn', label: 'Churn prediction' },
] as const

type TabId = (typeof tabs)[number]['id']

export function CalculatorsTabs() {
  const [active, setActive] = useState<TabId>('sdr')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-[#2A2826] pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active === t.id
                ? 'bg-[#0ED3CF] text-[#09090B]'
                : 'bg-[#1A1917] text-[#A8A29E] hover:bg-[#2A2826] hover:text-[#FAFAFA]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active calculator */}
      {active === 'sdr' && <SdrCalculator />}
      {active === 'support' && <SupportCalculator />}
      {active === 'rag' && <RagCalculator />}
      {active === 'voice' && <VoiceCalculator />}
      {active === 'churn' && <ChurnCalculator />}
    </div>
  )
}

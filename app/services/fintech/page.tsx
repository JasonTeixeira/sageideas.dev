import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Shield, Database, Zap, BarChart3, Bot } from 'lucide-react'

export const metadata: Metadata = {
  title: 'FinTech Software Development | Jason Teixeira — Trading Platforms & Financial Systems',
  description: 'Custom fintech development from a developer who trades futures daily. Trading platforms, payment systems, risk analytics, ML signal engines. Built a 185-table production platform independently.',
  openGraph: {
    title: 'FinTech Software Development — Jason Teixeira',
    description: 'Trading platforms, payment systems, risk analytics from an active futures trader. 185-table platform built independently.',
  },
  keywords: ['fintech developer', 'trading platform development', 'financial software engineer', 'custom trading system', 'algorithmic trading developer', 'payment system developer', 'risk management software'],
}

const capabilities = [
  { icon: TrendingUp, title: 'Trading Platforms', description: 'Real-time market data dashboards, order management, portfolio tracking. Built for speed — sub-50ms query times on 185+ table schemas.' },
  { icon: Shield, title: 'Risk Management', description: 'VaR/CVaR calculation, position sizing, drawdown monitoring. Ledoit-Wolf covariance estimation, Monte Carlo simulation, portfolio optimization.' },
  { icon: Database, title: 'Payment & Billing', description: 'Stripe integration with webhook idempotency, subscription lifecycle management, proration handling, dunning strategies.' },
  { icon: Zap, title: 'Real-Time Data', description: 'WebSocket streaming with auto-reconnection, market data pipelines, price alerting systems with millisecond latency.' },
  { icon: BarChart3, title: 'ML Signal Systems', description: '200+ technical indicators, walk-forward validation, ensemble ML models (XGBoost, LSTM, LightGBM) for systematic trading signals.' },
  { icon: Bot, title: 'Community Tools', description: 'AI-powered Discord/Telegram bots for trading communities. GPT-4o integration with financial safety guardrails, auto-moderation.' },
]

const proofPoints = [
  { metric: '185', label: 'Database Tables', detail: 'Nexural Trading Platform' },
  { metric: '69', label: 'API Endpoints', detail: 'Nexural Platform' },
  { metric: '200+', label: 'ML Indicators', detail: 'AlphaStream Engine' },
  { metric: '8', label: 'Symbols Traded', detail: 'Active Futures Trading' },
]

export default function FintechPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <span className="text-xs font-mono text-[#E85D3A] bg-[#E85D3A]/10 px-3 py-1 rounded-full">FinTech Development</span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] leading-tight">
          Trading Platforms & Financial Systems
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] max-w-3xl">
          {"I build fintech software as someone who uses it daily. I trade ES, NQ, CL, and GC futures every morning before I write code. When I build a trading platform, I'm building for myself — not just for a spec."}
        </p>
        <p className="mt-4 text-sm text-[#78716C] max-w-2xl">
          {"Most fintech developers know the code. I know the code AND the domain. That means fewer misunderstandings, fewer iterations, and software that traders actually want to use."}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-6 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Discovery Call <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/case-studies/nexural-ecosystem" className="inline-flex items-center px-6 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
            See the Nexural Case Study <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Proof Points */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {proofPoints.map(point => (
            <div key={point.label} className="p-5 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
              <p className="text-3xl font-bold text-[#FAFAFA]">{point.metric}</p>
              <p className="text-sm text-[#A8A29E] mt-1">{point.label}</p>
              <p className="text-xs text-[#78716C] mt-1">{point.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-8">What I Build for FinTech</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map(cap => (
            <div key={cap.title} className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#0ED3CF]/30 transition-colors">
              <cap.icon className="h-8 w-8 text-[#0ED3CF] mb-4" />
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{cap.title}</h3>
              <p className="text-sm text-[#A8A29E]">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Domain Expertise */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="p-8 bg-gradient-to-r from-[#0ED3CF]/10 to-[#E85D3A]/10 border border-[#0ED3CF]/20 rounded-2xl">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Why Domain Expertise Matters</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-[#A8A29E]">
            <div>
              <p className="mb-3">{"A developer who doesn't trade will build you a \"chart with buttons.\" A developer who trades daily will build you:"}</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#10B981]">+</span> Order entry that matches how traders think (not how databases store data)</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981]">+</span> Risk displays that show what you need in a crisis, not a dashboard</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981]">+</span> Alert systems calibrated for real market noise, not theoretical thresholds</li>
                <li className="flex items-start gap-2"><span className="text-[#10B981]">+</span> Backtesting that accounts for slippage, commissions, and partial fills</li>
              </ul>
            </div>
            <div>
              <p className="mb-3">My trading experience:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2"><span className="text-[#0ED3CF]">-</span> 8 futures symbols daily (ES, NQ, CL, GC, and more)</li>
                <li className="flex items-start gap-2"><span className="text-[#0ED3CF]">-</span> NinjaTrader 8 + Sierra Chart (C# strategy development)</li>
                <li className="flex items-start gap-2"><span className="text-[#0ED3CF]">-</span> 120,000+ word book on trading (24 chapters, editorial phase)</li>
                <li className="flex items-start gap-2"><span className="text-[#0ED3CF]">-</span> Built AlphaStream ML signal system with 200+ indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Ready to Build Your Trading System?</h2>
          <p className="text-[#A8A29E] mb-6">{"30-minute discovery call. We'll discuss your platform needs, timeline, and budget."}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-8 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
              Book a Call <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/services" className="inline-flex items-center px-8 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
              All Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

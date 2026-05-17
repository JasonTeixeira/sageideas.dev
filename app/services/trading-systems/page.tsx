import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Cpu, BarChart3, Bell, Bot, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Trading Systems Development | Jason Teixeira — Algorithmic Trading, NinjaTrader, Signal Engines',
  description: 'Custom trading systems from an active futures trader. Algorithmic strategies, NinjaTrader C# development, ML signal engines, backtesting, Discord bots for trading communities. 8 symbols traded daily.',
  openGraph: {
    title: 'Trading Systems Development — Jason Teixeira',
    description: 'Algorithmic trading, NinjaTrader C#, ML signals, backtesting. Built by an active futures trader.',
  },
  keywords: ['trading system developer', 'algorithmic trading', 'NinjaTrader developer', 'trading bot developer', 'backtesting engine', 'market data pipeline', 'quantitative trading'],
}

const systems = [
  { icon: Cpu, title: 'Algorithmic Strategies', description: 'Event-driven execution engines with state machines, position tracking, risk management. NinjaTrader C# or custom Python. Walk-forward validated, not curve-fit.', project: 'trade-engine' },
  { icon: TrendingUp, title: 'ML Signal Generation', description: '200+ technical indicators, 5 ML model architectures (XGBoost, LSTM, LightGBM), ensemble methods, walk-forward validation. Real-time streaming via FastAPI + Redis.', project: 'alphastream' },
  { icon: BarChart3, title: 'Backtesting Engines', description: 'Honest backtesting — slippage modeling, commission tracking, partial fills, look-ahead bias prevention. Quantstats metrics: Sharpe, max drawdown, expectancy.', project: 'quantumtrader' },
  { icon: Bell, title: 'Alert & Notification Systems', description: 'Price alerts with millisecond evaluation. WebSocket streaming with auto-reconnection. Multi-channel delivery: Discord, email, mobile push.', project: 'nt8-alert-system' },
  { icon: Bot, title: 'Community Trading Bots', description: 'Discord bots with GPT-4o integration for trading communities. Market data feeds, auto-moderation, educational AI (with financial safety guardrails).', project: 'nexural-discord-bot' },
  { icon: Shield, title: 'Risk Management', description: 'Portfolio risk analytics: VaR, CVaR, Ledoit-Wolf covariance, Monte Carlo simulation, portfolio optimization (Markowitz, risk parity, max diversification).', project: 'riskradar' },
]

export default function TradingSystemsPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <span className="text-xs font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 px-3 py-1 rounded-full">Trading Systems</span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] leading-tight">
          Trading Software Built by a Trader
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] max-w-3xl">
          {"I don't just build trading tools — I use them. Every morning at 6am, I'm trading ES, NQ, CL, and GC futures on NinjaTrader. The software I build for clients comes from the same mindset I apply to my own capital."}
        </p>
        <p className="mt-4 text-sm text-[#78716C] max-w-2xl">
          {"8 symbols daily. 120,000-word book on trading. AlphaStream ML signal system. Trade execution engine with event sourcing. This isn't a side project — it's my domain."}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-6 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Discovery Call <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/case-studies/alphastream" className="inline-flex items-center px-6 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
            See AlphaStream Case Study <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Systems */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-8">What I Build for Traders</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map(sys => (
            <div key={sys.title} className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#0ED3CF]/30 transition-colors">
              <sys.icon className="h-8 w-8 text-[#0ED3CF] mb-4" />
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{sys.title}</h3>
              <p className="text-sm text-[#A8A29E] mb-3">{sys.description}</p>
              <Link href={`/projects`} className="text-xs text-[#0ED3CF] hover:text-[#22D3EE] transition-colors">
                View project →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trading Blog Posts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">Trading Engineering Articles</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Feature Engineering: 200+ Indicators', slug: 'feature-engineering-for-trading-200-indicators-that-actually-matter' },
            { title: 'Backtesting Engine That Doesn\'t Lie', slug: 'building-a-backtesting-engine-that-doesn-t-lie-to-you' },
            { title: 'Portfolio Risk Math Explained', slug: 'portfolio-risk-math-explained-var-cvar-and-why-covariance-estimation-matters' },
            { title: 'What Trading Taught Me About Software', slug: 'what-trading-futures-taught-me-about-writing-software' },
            { title: 'WebSocket Architecture for Trading', slug: 'real-time-websocket-architecture-patterns-that-actually-scale' },
            { title: 'Writing a 120K-Word Trading Book', slug: 'writing-a-120-000-word-book-while-building-software-full-time' },
          ].map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
              <span className="text-xs font-mono text-[#0ED3CF]">Blog</span>
              <p className="text-sm font-semibold text-[#FAFAFA] mt-2">{post.title}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Ready to Build Your Trading Edge?</h2>
          <p className="text-[#A8A29E] mb-6">{"From signal engines to execution systems — built by someone who trades."}</p>
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

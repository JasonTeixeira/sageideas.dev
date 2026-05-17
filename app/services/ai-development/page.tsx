import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Brain, Bot, MessageSquare, Shield, Zap, Database } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI & LLM Application Development | Jason Teixeira — GPT-4o, Claude, AI Bots',
  description: 'Custom AI application development — GPT-4o integration, Claude API, Discord/Slack bots with AI, content automation, AI safety guardrails. Built a 30-command AI Discord bot for a trading community.',
  openGraph: {
    title: 'AI & LLM Application Development — Jason Teixeira',
    description: 'GPT-4o, Claude API integration. AI bots, content automation, safety guardrails.',
  },
  keywords: ['ai developer', 'llm integration', 'gpt-4 developer', 'claude api', 'ai chatbot development', 'ai automation', 'custom ai application'],
}

const capabilities = [
  { icon: Bot, title: 'AI-Powered Bots', description: 'Discord, Slack, and Telegram bots with LLM integration. Context-aware conversations, command systems, community management. Built a 30-command trading bot with GPT-4o.' },
  { icon: MessageSquare, title: 'LLM Integration', description: 'GPT-4o, Claude, and open-source model integration into existing applications. System prompts, conversation context, response validation, streaming.' },
  { icon: Shield, title: 'AI Safety & Guardrails', description: 'Content filtering, response validation, domain-specific restrictions. Critical for financial, healthcare, and regulated industries where AI responses have consequences.' },
  { icon: Zap, title: 'Content Automation', description: 'Newsletter generation, report automation, data summarization pipelines. AI-powered content that sounds human and serves a purpose.' },
  { icon: Database, title: 'Data Pipelines for AI', description: 'Feature engineering, data preprocessing, embedding generation, vector search. The infrastructure that makes AI applications actually work.' },
  { icon: Brain, title: 'ML Signal Systems', description: 'Supervised learning for prediction — XGBoost, LightGBM, LSTM. Walk-forward validation, ensemble methods, real-time inference via FastAPI.' },
]

export default function AIDevPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <span className="text-xs font-mono text-[#E85D3A] bg-[#E85D3A]/10 px-3 py-1 rounded-full">AI Development</span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA] leading-tight">
          AI Applications That Actually Work
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] max-w-3xl">
          {"Not another chatbot wrapper. I build AI applications with proper guardrails, context management, and domain-specific safety — because in fintech, a wrong AI response can cost real money."}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-6 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Discovery Call <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/case-studies/nexural-discord-bot" className="inline-flex items-center px-6 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
            See the Discord Bot Case Study <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-normal text-[#FAFAFA] mb-8">What I Build with AI</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map(cap => (
            <div key={cap.title} className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#E85D3A]/30 transition-colors">
              <cap.icon className="h-8 w-8 text-[#E85D3A] mb-4" />
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{cap.title}</h3>
              <p className="text-sm text-[#A8A29E]">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">AI Engineering Articles</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/blog/building-an-ai-discord-bot-for-a-trading-community" className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
            <span className="text-xs font-mono text-[#0ED3CF]">Blog</span>
            <p className="text-sm font-semibold text-[#FAFAFA] mt-2">Building an AI Discord Bot for Trading</p>
          </Link>
          <Link href="/blog/feature-engineering-for-trading-200-indicators-that-actually-matter" className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
            <span className="text-xs font-mono text-[#0ED3CF]">Blog</span>
            <p className="text-sm font-semibold text-[#FAFAFA] mt-2">ML Feature Engineering: 200+ Indicators</p>
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Need AI in Your Product?</h2>
          <p className="text-[#A8A29E] mb-6">{"From LLM integration to custom ML systems — let's build AI that's safe and useful."}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-8 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
              Book a Call <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/services" className="inline-flex items-center px-8 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">All Services</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

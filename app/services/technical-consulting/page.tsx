import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Lightbulb, FileSearch, Users, GitBranch, Shield, BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Technical Consulting & Architecture Reviews | Jason Teixeira',
  description: 'Technical consulting for startups and engineering teams. Architecture reviews, code audits, test strategy, cloud infrastructure planning. Remote.',
  openGraph: {
    title: 'Technical Consulting & Architecture Reviews — Jason Teixeira',
    description: 'Architecture reviews, code audits, test strategy, cloud planning.',
  },
  keywords: ['technical consultant', 'architecture review', 'code audit', 'startup technical advisor', 'engineering consultant'],
}

const services = [
  { icon: FileSearch, title: 'Architecture Review', description: 'Deep analysis of your system architecture. I review database design, API structure, deployment pipeline, and security posture. You get a written report with prioritized recommendations.', price: 'From $2,500' },
  { icon: GitBranch, title: 'Code Audit', description: 'Comprehensive code quality assessment. Test coverage gaps, performance bottlenecks, security vulnerabilities, maintainability issues. Actionable findings, not just a list of complaints.', price: 'From $1,500' },
  { icon: Shield, title: 'Test Strategy Consulting', description: 'Build your QA practice from scratch or fix a broken one. Framework selection, CI/CD integration, coverage strategy, flaky test elimination. ISTQB certified across 3 disciplines.', price: 'From $3,000' },
  { icon: BarChart3, title: 'Cloud Infrastructure Planning', description: 'AWS architecture design, cost optimization, Terraform module structure, CI/CD pipeline setup. I keep a 185-table production platform under $50/month — I can optimize yours.', price: 'From $2,000' },
  { icon: Users, title: 'Hiring & Team Building', description: 'Help defining engineering roles, reviewing candidates, building interview processes. I understand what it takes to build and ship software from both the business and technical side.', price: '$150/hr' },
  { icon: Lightbulb, title: 'Technical Advisory', description: 'Tech stack selection, architecture decisions, build vs buy, MVP scoping, technical due diligence. I\'ve built an entire platform solo — I know what corners to cut and which to never cut.', price: 'Contact for rates' },
]

export default function ConsultingPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1 rounded-full">Consulting</span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] leading-tight">
          Expert Guidance Without the Agency Overhead
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] max-w-3xl">
          {"You don't always need someone to build. Sometimes you need someone to review, advise, or plan. I offer targeted consulting for architecture decisions, code quality, test strategy, and cloud infrastructure."}
        </p>
        <p className="mt-4 text-sm text-[#78716C]">
          $150/hr for advisory. Fixed-price for reviews and audits. No retainer required.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-6 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Free 30-Min Intro <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/contact" className="inline-flex items-center px-6 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
            Send a Message <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-8">Consulting Services</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {services.map(svc => (
            <div key={svc.title} className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#F59E0B]/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <svc.icon className="h-8 w-8 text-[#F59E0B]" />
                <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded">{svc.price}</span>
              </div>
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{svc.title}</h3>
              <p className="text-sm text-[#A8A29E]">{svc.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="p-8 bg-gradient-to-r from-[#F59E0B]/10 to-[#0ED3CF]/10 border border-[#F59E0B]/20 rounded-2xl">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Why Consulting Works</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-sm text-[#A8A29E]">
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Faster than hiring</p>
              <p>{"A consulting engagement starts this week. Hiring an engineer takes 3-6 months. Get expert input now, hire later if needed."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Cheaper than mistakes</p>
              <p>{"A $2,500 architecture review is cheaper than rebuilding a system 6 months later because the foundation was wrong."}</p>
            </div>
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Knowledge transfer</p>
              <p>{"I don't just fix things — I explain why. Your team leaves the engagement better than they started."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Need Expert Guidance?</h2>
          <p className="text-[#A8A29E] mb-6">{"Free 30-minute intro call. No commitment, just clarity on whether I can help."}</p>
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-8 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Free Intro Call <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

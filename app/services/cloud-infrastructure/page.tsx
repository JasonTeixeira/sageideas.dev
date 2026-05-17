import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Cloud, Shield, GitBranch, DollarSign, Server, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cloud Infrastructure & DevOps | Jason Teixeira — AWS, Terraform, CI/CD',
  description: 'AWS infrastructure architecture, Terraform IaC, CI/CD pipelines, and DevOps automation. 5 AWS certifications + Cisco Networking, production Terraform modules, GitHub OIDC keyless deployments. Orlando, FL.',
  openGraph: {
    title: 'Cloud Infrastructure & DevOps — Jason Teixeira',
    description: 'AWS, Terraform, CI/CD. 5 AWS certs + Cisco Networking, production modules, keyless OIDC deployments.',
  },
  keywords: ['aws cloud architect', 'terraform consultant', 'devops engineer', 'CI/CD pipeline', 'cloud infrastructure', 'aws certified', 'infrastructure as code'],
}

const capabilities = [
  { icon: Cloud, title: 'AWS Architecture', description: 'Multi-account organizations, landing zones, VPC design, S3+CloudFront hosting, Lambda serverless APIs. Cost-optimized — I keep a production platform under $50/month.' },
  { icon: Server, title: 'Infrastructure as Code', description: '4 published Terraform modules (VPC, S3 static site, Lambda API, GitHub OIDC). Variable validation, consistent tagging, security-scanned with Checkov.' },
  { icon: GitBranch, title: 'CI/CD Pipelines', description: 'GitHub Actions workflows with parallel execution, Docker layer caching, multi-stage builds. 82% pipeline time reduction on real projects.' },
  { icon: Lock, title: 'Security & Compliance', description: 'WAF rate limiting, IAM least privilege, OIDC federation (no static keys), SCPs for guardrails. Evidence-backed — attack simulations and proof artifacts.' },
  { icon: DollarSign, title: 'Cost Optimization', description: 'Architecture designed for cost. Managed services at free/cheap tiers, pay-per-use Lambda, S3 Intelligent-Tiering. $50/month for a 185-table platform.' },
  { icon: Shield, title: 'SLOs & Operations', description: '99.9% availability targets, incident drill playbooks, failure mode documentation. I treat infrastructure like production — because it is.' },
]

export default function CloudInfraPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1 rounded-full">Cloud & DevOps</span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] leading-tight">
          Cloud Infrastructure That Scales and Costs What It Should
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] max-w-3xl">
          {"5 AWS certifications + Cisco Networking. Published Terraform modules. Production landing zones. GitHub OIDC federation. I build cloud infrastructure with the same rigor I apply to application code — tested, documented, and cost-aware."}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="https://cal.com/jason-teixeira-8elz3z" target="_blank" className="inline-flex items-center px-6 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors">
            Book a Discovery Call <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/platform" className="inline-flex items-center px-6 py-3 border border-[#3D3A37] text-[#A8A29E] rounded-xl hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors">
            See Platform Engineering <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-8">Cloud Capabilities</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map(cap => (
            <div key={cap.title} className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#F59E0B]/30 transition-colors">
              <cap.icon className="h-8 w-8 text-[#F59E0B] mb-4" />
              <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">{cap.title}</h3>
              <p className="text-sm text-[#A8A29E]">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AWS Certifications */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="p-8 bg-gradient-to-r from-[#F59E0B]/10 to-[#0ED3CF]/10 border border-[#F59E0B]/20 rounded-2xl">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Cloud & Network Certifications</h2>
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {['Cloud Essentials', 'Serverless', 'Migration Foundations', 'Braket (Quantum)', 'Cloud Practitioner', 'Cisco Networking'].map(cert => (
              <div key={cert} className="p-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-center">
                <p className="text-xs font-medium text-[#FAFAFA]">{cert}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <h2 className="text-2xl font-bold text-[#FAFAFA] mb-6">Related Resources</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/blog/terraform-module-patterns-how-i-structure-iac-for-reuse" className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
            <span className="text-xs font-mono text-[#0ED3CF]">Blog</span>
            <p className="text-sm font-semibold text-[#FAFAFA] mt-2">Terraform Module Patterns</p>
          </Link>
          <Link href="/blog/aws-cost-optimization-how-i-keep-a-production-platform-under-50-month" className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
            <span className="text-xs font-mono text-[#0ED3CF]">Blog</span>
            <p className="text-sm font-semibold text-[#FAFAFA] mt-2">AWS Cost Under $50/Month</p>
          </Link>
          <Link href="/case-studies/aws-landing-zone" className="p-4 bg-[#1A1917] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-colors">
            <span className="text-xs font-mono text-[#0ED3CF]">Case Study</span>
            <p className="text-sm font-semibold text-[#FAFAFA] mt-2">AWS Landing Zone</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-3">Need Cloud Infrastructure?</h2>
          <p className="text-[#A8A29E] mb-6">{"From landing zones to serverless APIs — let's architect your cloud."}</p>
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

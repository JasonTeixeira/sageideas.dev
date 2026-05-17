import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ArrowRight, Shield, Handshake, Cookie, FileSignature, FileCheck, ScrollText } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Privacy policy, terms of service, cookie policy, master services agreement, NDA template, and statement of work template for Sage Ideas LLC.',
  openGraph: {
    images: ['/og?title=Legal+Documents&subtitle=Sage+Ideas+LLC'],
  },
}

const docs = [
  {
    slug: 'privacy',
    icon: Shield,
    title: 'Privacy Policy',
    description: 'How Sage Ideas LLC collects, uses, and protects your personal information on sageideas.dev, including GDPR and CCPA rights disclosures.',
  },
  {
    slug: 'terms',
    icon: ScrollText,
    title: 'Terms of Service',
    description: 'The terms governing access to and use of sageideas.dev, studio services, and related properties.',
  },
  {
    slug: 'cookies',
    icon: Cookie,
    title: 'Cookie Policy',
    description: 'What cookies and tracking technologies Sage Ideas uses, why, and how to control them.',
  },
  {
    slug: 'msa',
    icon: Handshake,
    title: 'Master Services Agreement',
    description: 'The standard contract governing all client engagements with Sage Ideas LLC — scope, payment terms, IP ownership, and liability.',
  },
  {
    slug: 'nda',
    icon: FileSignature,
    title: 'Non-Disclosure Agreement',
    description: 'Mutual NDA template used for discovery calls and sensitive project discussions. Available for signature on request.',
  },
  {
    slug: 'sow-template',
    icon: FileCheck,
    title: 'Statement of Work Template',
    description: 'The standard SOW structure used for all productized engagements — defines scope, deliverables, timeline, and acceptance criteria.',
  },
]

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-12">
          <SectionLabel>Legal</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-[#FAFAFA]">Legal Documents</h1>
          <p className="mt-4 text-lg text-[#A8A29E] max-w-2xl">
            All governing documents for Sage Ideas LLC — client contracts, privacy terms, and policy templates. Written
            in plain language where possible.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/legal/${doc.slug}`}
              className="group p-6 bg-[#12110F] border border-[#2A2826] rounded-xl hover:border-[#0ED3CF]/50 transition-all duration-200 hover:-translate-y-1"
            >
              <div className="p-3 bg-[#0ED3CF]/10 rounded-xl w-fit mb-4">
                <doc.icon className="h-5 w-5 text-[#0ED3CF]" />
              </div>
              <h2 className="text-lg font-semibold text-[#FAFAFA] mb-2 group-hover:text-[#0ED3CF] transition-colors">
                {doc.title}
              </h2>
              <p className="text-sm text-[#A8A29E] leading-relaxed mb-4">{doc.description}</p>
              <span className="inline-flex items-center text-xs text-[#0ED3CF] font-medium group-hover:gap-2 transition-all">
                Read document
                <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-16 p-6 bg-[#12110F] border border-[#2A2826] rounded-xl max-w-2xl">
          <p className="text-sm text-[#A8A29E] leading-relaxed">
            <span className="text-[#FAFAFA] font-medium">Questions about any of these documents?</span>{' '}
            Email{' '}
            <a href="mailto:sage@sageideas.dev" className="text-[#0ED3CF] hover:text-[#22D3EE]">
              sage@sageideas.dev
            </a>
            . We&apos;ll respond in plain English.
          </p>
        </div>
      </div>
    </div>
  )
}

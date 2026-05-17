import type { Metadata } from 'next'
import { tiersOrdered, careTiers } from '@/data/services/tiers'
import { extendedTiers } from '@/data/services/extended'
import { pricingFaq } from '@/data/services/pricing-faq'
import { PricingContent } from './pricing-content'
import V0PricingPage from '@/components/v0-pricing/pricing-page'
import { ExtendedPricingMenu } from './extended-pricing-menu'
import { JsonLd } from '@/components/json-ld'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'

const SITE = 'https://www.sageideas.dev'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pricingFaq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE}/pricing` },
  ],
}

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Full pricing menu from Sage Ideas: productized engineering and QA tiers, AI reliability audits, RAG and agent ops, automation pipelines, customer-facing AI products, productized retainers, diagnostic on-ramps from $1,200, and a 90-day Done-For-You bundle. Fixed scope, transparent pricing.',
  alternates: { canonical: `${SITE}/pricing` },
  openGraph: {
    title: 'Pricing',
    description: 'Engineering, QA, AI, automation, retainers, and bundles. Fixed price.',
    images: [{ url: '/og?title=Pricing&subtitle=Engineering%2C+AI%2C+automation%2C+retainers.' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og?title=Pricing&subtitle=Engineering%2C+AI%2C+automation%2C+retainers.'],
  },
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={[faqSchema, breadcrumbSchema]} />
      <PageViewTracker event="pricing_view" />
      <V0PricingPage heroImageSrc="/images/hero-pricing.jpg" />
      <ExtendedPricingMenu extended={extendedTiers} care={careTiers} />
    </>
  )
}

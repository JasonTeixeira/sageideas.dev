import { academyTracks, type AcademyTrack } from './tracks'

export type AcademyProductStatus = 'early_access' | 'checkout_ready'

export type AcademyProduct = {
  trackSlug: string
  name: string
  status: AcademyProductStatus
  priceCents: number
  priceLabel: string
  checkoutLabel: string
  stripeEnvVar: string
  stripePriceId?: string
  packageIncludes: string[]
  refundPolicy: string
  accessPolicy: string
  requirements: string[]
}

const baseRequirements = ['Stripe product and price IDs'] as const

export function isAcademyPaidEnrollmentEnabled(): boolean {
  return process.env.ACADEMY_PAID_ENROLLMENT_ENABLED === 'true'
    && process.env.ACADEMY_CERTIFICATION_STATE === 'certified'
}

const stripeEnvByTrack: Record<string, string> = {
  'ai-native-product-building': 'STRIPE_PRICE_ACADEMY_PRODUCT_BUILDING',
  'premium-conversion-sites': 'STRIPE_PRICE_ACADEMY_CONVERSION_SITES',
  'content-engine': 'STRIPE_PRICE_ACADEMY_CONTENT_ENGINE',
  'ai-automation-systems': 'STRIPE_PRICE_ACADEMY_AUTOMATION_SYSTEMS',
}

const packageByTrack: Record<
  string,
  {
    priceCents: number
    packageIncludes: string[]
  }
> = {
  'ai-native-product-building': {
    priceCents: 49700,
    packageIncludes: [
      '4-module product build curriculum',
      'Offer-to-product map template',
      'AI feature boundary checklist',
      'Launch readiness worksheet',
    ],
  },
  'premium-conversion-sites': {
    priceCents: 49700,
    packageIncludes: [
      '4-module conversion site curriculum',
      'Homepage architecture worksheet',
      'Proof ladder and CTA map templates',
      'Motion rules and QA checklist',
    ],
  },
  'content-engine': {
    priceCents: 39700,
    packageIncludes: [
      '5-module content engine curriculum',
      'Topic cluster planning system',
      'Build-log and newsletter templates',
      'Weekly repurposing checklist',
    ],
  },
  'ai-automation-systems': {
    priceCents: 49700,
    packageIncludes: [
      '4-module automation systems curriculum',
      'Automation audit worksheet',
      'Human-in-loop agent spec template',
      'Measurement and risk gate checklist',
    ],
  },
}

const refundPolicy =
  '14-day refund window after purchase, provided less than 20% of the course has been completed or downloaded. Cohort/live-session access is non-transferable.'

const accessPolicy =
  'Self-paced access opens only after the track is certified, paid enrollment is explicitly approved, and checkout completes. Updates to the purchased track are included for at least 12 months.'

export const academyProducts: AcademyProduct[] = academyTracks.map((track) => {
  const checkoutReady = Boolean(process.env[stripeEnvByTrack[track.slug]])
    && isAcademyPaidEnrollmentEnabled()
  return {
    trackSlug: track.slug,
    name: `${track.title} — Founding Access`,
    status: checkoutReady ? 'checkout_ready' : 'early_access',
    priceCents: packageByTrack[track.slug]?.priceCents ?? 49700,
    priceLabel: formatPrice(packageByTrack[track.slug]?.priceCents ?? 49700),
    checkoutLabel: checkoutReady ? 'Stripe checkout' : 'early access',
    stripeEnvVar: stripeEnvByTrack[track.slug] ?? `STRIPE_PRICE_ACADEMY_${track.slug.toUpperCase().replaceAll('-', '_')}`,
    stripePriceId: process.env[stripeEnvByTrack[track.slug]],
    packageIncludes: packageByTrack[track.slug]?.packageIncludes ?? [
      'Course curriculum',
      'Templates and worksheets',
      'Build notes from the studio',
      'Launch checklist',
    ],
    refundPolicy,
    accessPolicy,
    requirements: checkoutReady
      ? []
      : [
          ...baseRequirements,
          `Set ${stripeEnvByTrack[track.slug]}`,
          'Complete Academy certification and explicitly approve paid enrollment',
        ],
  }
})

export function getAcademyProduct(track: AcademyTrack): AcademyProduct {
  return (
    academyProducts.find((product) => product.trackSlug === track.slug) ?? {
      trackSlug: track.slug,
      name: `${track.title} — Founding Access`,
      status: 'early_access',
      priceCents: 49700,
      priceLabel: '$497',
      checkoutLabel: 'early access',
      stripeEnvVar: `STRIPE_PRICE_ACADEMY_${track.slug.toUpperCase().replaceAll('-', '_')}`,
      packageIncludes: ['Course curriculum', 'Templates and worksheets', 'Build notes', 'Launch checklist'],
      refundPolicy,
      accessPolicy,
      requirements: [...baseRequirements],
    }
  )
}

export function getAcademyProductBySlug(slug: string): AcademyProduct | undefined {
  const track = academyTracks.find((item) => item.slug === slug)
  return track ? getAcademyProduct(track) : undefined
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceCents / 100)
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CareCheckoutButton } from '@/components/studio/care-checkout-button'
import { CheckoutButton } from '@/components/studio/checkout-button'
import { careTiersBySlug, tiersBySlug } from '@/data/services/tiers'
import { isSelfServe } from '@/data/services/tier-classification'

export const metadata: Metadata = {
  title: 'Review checkout · Sage Ideas',
  description: 'Review the selected Sage Ideas engagement before opening secure checkout.',
  robots: { index: false, follow: false },
}

export default async function CheckoutReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tier = tiersBySlug[slug]
  const care = careTiersBySlug[slug]

  if (!tier && !care) notFound()
  if (tier && !isSelfServe(tier)) redirect(`/book?tier=${encodeURIComponent(tier.slug)}`)

  const offer = tier ?? care
  const recurring = Boolean(care)

  return (
    <div className="min-h-screen bg-[#09090B] px-4 py-20 text-[#FAFAFA]">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[#8FA0FF]">
          Review before checkout
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight">{offer.name}</h1>
        <p className="mb-8 max-w-xl text-base leading-relaxed text-[#A8A29E]">
          {offer.description}
        </p>

        <section className="mb-8 rounded-2xl border border-[#2A2826] bg-[#12110F] p-6" aria-labelledby="checkout-summary">
          <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-[#2A2826] pb-5">
            <h2 id="checkout-summary" className="text-lg font-semibold">Order summary</h2>
            <p className="text-xl font-semibold">
              {offer.price}{recurring ? '/month' : ''}
            </p>
          </div>
          <ul className="space-y-2 text-sm text-[#D6D3D1]">
            {offer.outcomes.slice(0, 4).map((outcome) => <li key={outcome}>✓ {outcome}</li>)}
          </ul>
          {recurring && (
            <p className="mt-5 text-xs leading-relaxed text-[#A8A29E]">
              Recurring monthly subscription. You can cancel before the next billing period.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {tier ? (
            <CheckoutButton tier={tier} label={`Continue securely — ${tier.price}`} />
          ) : (
            <CareCheckoutButton care={care!} label={`Subscribe securely — ${care!.price}/mo`} />
          )}
          <Link href={tier ? `/services/${tier.slug}` : '/pricing'} className="text-sm text-[#A8A29E] underline underline-offset-4 hover:text-white">
            Go back
          </Link>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-[#A8A29E]">
          The next step opens Stripe’s hosted checkout. No payment is taken until you review and submit there.
          Need help? <a href="mailto:sage@sageideas.dev" className="text-[#8FA0FF] underline underline-offset-2">sage@sageideas.dev</a>
        </p>
      </div>
    </div>
  )
}

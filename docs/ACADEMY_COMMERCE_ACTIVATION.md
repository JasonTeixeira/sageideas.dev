# Academy Commerce Activation

> **Historical activation proposal.** Pricing and packaging in this document are not approved commercial truth. See [Academy Packaging and Pricing ADR](./academy/adr/0002-academy-packaging-pricing-decision.md).

The academy checkout path is implemented, but it remains gated until real Stripe price IDs are configured.

## Packages

| Track | Product | Price | Stripe env var |
| --- | --- | ---: | --- |
| AI-Native Product Building | AI-Native Product Building — Founding Access | $497 | `STRIPE_PRICE_ACADEMY_PRODUCT_BUILDING` |
| Premium Conversion Sites | Premium Conversion Sites — Founding Access | $497 | `STRIPE_PRICE_ACADEMY_CONVERSION_SITES` |
| Content Engine For Builders | Content Engine For Builders — Founding Access | $397 | `STRIPE_PRICE_ACADEMY_CONTENT_ENGINE` |
| AI Automation Systems | AI Automation Systems — Founding Access | $497 | `STRIPE_PRICE_ACADEMY_AUTOMATION_SYSTEMS` |

## Policy

- Refund policy: 14-day refund window after purchase, provided less than 20% of the course has been completed or downloaded. Cohort/live-session access is non-transferable.
- Access policy: self-paced access opens immediately after checkout when Stripe products are configured. Updates to the purchased track are included for at least 12 months.

## Stripe Setup

Create one Stripe Product per academy track, then create one one-time Price per product.

Use Stripe-hosted Checkout Sessions. The site will send:

- `mode: payment`
- `line_items: [{ price: <env var price id>, quantity: 1 }]`
- `metadata.kind: academy`
- `metadata.track_slug: <track slug>`

## Environment Variables

Set these in Vercel for Preview and Production after creating the Stripe Prices:

```bash
STRIPE_PRICE_ACADEMY_PRODUCT_BUILDING=price_...
STRIPE_PRICE_ACADEMY_CONVERSION_SITES=price_...
STRIPE_PRICE_ACADEMY_CONTENT_ENGINE=price_...
STRIPE_PRICE_ACADEMY_AUTOMATION_SYSTEMS=price_...
```

Existing Stripe runtime variables are still required for live checkout:

```bash
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

## Verification

Before launch:

1. Open `/academy/<track>/enroll`.
2. Confirm the page shows `Stripe checkout` instead of `early access`.
3. Click the enrollment button.
4. Confirm the redirect lands on `https://checkout.stripe.com/`.
5. Complete a test purchase.
6. Confirm the success URL returns to `/academy/<track>/enroll?checkout=success`.

Do not enable live mode until test mode succeeds for all four tracks.

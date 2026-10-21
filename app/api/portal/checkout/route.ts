import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { getServiceCatalog } from '@/lib/portal/queries';
import { badRequest, fromZodError } from '@/lib/api-errors';
import { billingIdempotencyKey } from '@/lib/billing/integrity';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { canonicalSiteOrigin } from '@/lib/security/site-origin';

const schema = z.object({
  priceId: z.string().min(1).max(120),
  requestKey: z.string().uuid(),
  recurring: z.union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')]).optional(),
});

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  const formData = await req.formData();
  const parsed = schema.safeParse({
    priceId: formData.get('priceId'),
    requestKey: formData.get('requestKey'),
    recurring: formData.get('recurring') ?? undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const { priceId, requestKey } = parsed.data;

  // Allowlist: only price IDs from the active service catalog may be purchased, and the
  // catalog — not the client — dictates one-time vs subscription. This blocks a user from
  // checking out arbitrary (internal/test/one-off) Stripe prices or forging the charge mode.
  const catalog = (await getServiceCatalog()) as Array<{
    stripe_price_id?: string | null;
    recurring?: boolean | null;
  }>;
  const item = catalog.find((c) => c.stripe_price_id === priceId);
  if (!item) return badRequest('That item is not available.');
  const recurring = !!item.recurring;

  if (!isStripeConfigured()) return badRequest('Stripe not configured');
  const stripe = getStripe();
  const requestUrl = new URL(req.url);
  const baseUrl = canonicalSiteOrigin({
    configured: process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
    forwardedHost: requestUrl.host,
    forwardedProto: requestUrl.protocol.slice(0, -1),
    production: process.env.NODE_ENV === 'production',
  });
  const idempotencyKey = billingIdempotencyKey(
    'portal-catalog-checkout',
    ctx.user.clerk_id,
    priceId,
    recurring ? 'subscription' : 'payment',
    requestKey,
  );

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: recurring ? 'subscription' : 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: ctx.user.email,
        success_url: `${baseUrl}/portal/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/portal/catalog?canceled=1`,
        metadata: {
          organization_id: ctx.organizationId ?? '',
          auth_user_id: ctx.user.clerk_id,
        },
      },
      { idempotencyKey },
    );

    if (!session.url) return badRequest('Checkout unavailable');
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('[portal/checkout] Stripe session creation failed', error);
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 502 });
  }
}

import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getPortalContext } from '@/lib/portal/auth';
import { badRequest, fromZodError } from '@/lib/api-errors';

const schema = z.object({
  priceId: z.string().min(1).max(120),
  recurring: z.union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')]).optional(),
});

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  const formData = await req.formData();
  const parsed = schema.safeParse({
    priceId: formData.get('priceId'),
    recurring: formData.get('recurring') ?? undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const { priceId } = parsed.data;
  const recurring = parsed.data.recurring === '1' || parsed.data.recurring === 'true';

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return badRequest('Stripe not configured');

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-04-22.dahlia' as any,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // Stable idempotency key per (user, price, mode, day-bucket) so a double-
  // submit from the same form within 24h returns the same Stripe session.
  const dayBucket = new Date().toISOString().slice(0, 10);
  const idempotencyKey = createHash('sha256')
    .update(`${ctx.user.clerk_id}:${priceId}:${recurring ? 'sub' : 'pay'}:${dayBucket}`)
    .digest('hex');

  const session = await stripe.checkout.sessions.create(
    {
      mode: recurring ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: ctx.user.email,
      success_url: `${baseUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/catalog?canceled=1`,
      metadata: {
        organization_id: ctx.organizationId ?? '',
        auth_user_id: ctx.user.clerk_id,
      },
    },
    { idempotencyKey },
  );

  return NextResponse.redirect(session.url!, 303);
}

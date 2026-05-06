import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPortalContext } from '@/lib/portal/auth';

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  const formData = await req.formData();
  const priceId = formData.get('priceId') as string;
  const recurring = formData.get('recurring') === '1';

  if (!priceId) return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia' as any,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: recurring ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: ctx.user.email,
    success_url: `${baseUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/catalog?canceled=1`,
    metadata: {
      organization_id: ctx.organizationId ?? '',
      auth_user_id: ctx.user.clerk_id,
    },
  });

  return NextResponse.redirect(session.url!, 303);
}

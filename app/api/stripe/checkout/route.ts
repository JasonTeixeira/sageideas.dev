import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getStripe,
  getOrCreateCustomer,
  isStripeConfigured,
} from '@/lib/stripe/client';
import {
  assertSupabaseSuccess,
  billingIdempotencyKey,
  isInvoicePayable,
  toPositiveIntegerCents,
} from '@/lib/billing/integrity';
import { canonicalSiteOrigin } from '@/lib/security/site-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Invoice = {
  id: string;
  number: string | null;
  status: string | null;
  total: number | string | null;
  amount_due: number | string | null;
  currency: string | null;
  stripe_checkout_session_id: string | null;
  organization_id: string;
};

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  if (!isStripeConfigured()) {
    console.warn('[stripe/checkout] STRIPE_SECRET_KEY missing');
    return NextResponse.json(
      { error: 'Stripe is not configured on this environment.' },
      { status: 503 },
    );
  }

  let body: { invoice_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const invoiceId = body.invoice_id?.trim();
  if (!invoiceId) {
    return NextResponse.json({ error: 'invoice_id required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: invoiceRow, error: invErr } = await sb
    .from('invoices')
    .select('id, number, status, total, amount_due, currency, stripe_checkout_session_id, organization_id')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invErr) {
    console.error('[stripe/checkout] invoice lookup', invErr);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!invoiceRow) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  const invoice = invoiceRow as Invoice;

  if (!ctx.isAdmin && invoice.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isInvoicePayable(invoice.status)) {
    return NextResponse.json(
      { error: 'Invoice is not payable' },
      { status: 409 },
    );
  }

  const totalCents = toPositiveIntegerCents(invoice.total ?? invoice.amount_due ?? 0);
  if (totalCents === null) {
    return NextResponse.json({ error: 'Invoice total is invalid' }, { status: 400 });
  }
  const currency = (invoice.currency ?? 'usd').toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) {
    return NextResponse.json({ error: 'Invoice currency is invalid' }, { status: 400 });
  }

  const stripe = getStripe();
  if (invoice.stripe_checkout_session_id) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        invoice.stripe_checkout_session_id,
      );
      if (existingSession.status === 'open' && existingSession.url) {
        return NextResponse.json({ url: existingSession.url, reused: true });
      }
      if (existingSession.status === 'complete') {
        return NextResponse.json({ error: 'Invoice checkout is already complete' }, { status: 409 });
      }
    } catch (error) {
      console.error('[stripe/checkout] existing session lookup', error);
      return NextResponse.json({ error: 'Unable to verify existing checkout' }, { status: 502 });
    }
  }

  let customerId: string;
  try {
    customerId = await getOrCreateCustomer(invoice.organization_id);
  } catch (err) {
    console.error('[stripe/checkout] customer', err);
    return NextResponse.json(
      { error: 'Failed to create Stripe customer' },
      { status: 500 },
    );
  }

  const requestUrl = new URL(req.url);
  const baseUrl = canonicalSiteOrigin({
    configured: process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
    forwardedHost: requestUrl.host,
    forwardedProto: requestUrl.protocol.slice(0, -1),
    production: process.env.NODE_ENV === 'production',
  });

  try {
    // Every invoice has one active checkout. An expired session becomes the
    // generation token for its replacement while concurrent requests collapse.
    const idempotencyKey = billingIdempotencyKey(
      'invoice-checkout',
      invoice.id,
      invoice.stripe_checkout_session_id ?? 'initial',
    );
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: totalCents,
              product_data: {
                name: invoice.number
                  ? `Invoice ${invoice.number}`
                  : `Invoice ${invoice.id.slice(0, 8)}`,
              },
            },
          },
        ],
        success_url: `${baseUrl}/portal/invoices/${invoice.id}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/portal/invoices/${invoice.id}/pay/cancel`,
        metadata: { invoice_id: invoice.id },
        payment_intent_data: {
          metadata: { invoice_id: invoice.id },
        },
      },
      { idempotencyKey },
    );

    const persistence = await sb
      .from('invoices')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', invoice.id);
    assertSupabaseSuccess(persistence, 'invoice checkout session persistence');

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout] create session', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}

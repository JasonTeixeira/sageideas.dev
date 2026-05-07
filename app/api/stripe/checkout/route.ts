import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getStripe,
  getOrCreateCustomer,
  isStripeConfigured,
} from '@/lib/stripe/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LineItem = {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
};

type Invoice = {
  id: string;
  number: string | null;
  status: string | null;
  total: number | string | null;
  amount: number | string | null;
  organization_id: string;
};

export async function POST(req: Request) {
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

  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: invoiceRow, error: invErr } = await sb
    .from('invoices')
    .select('id, number, status, total, amount, organization_id')
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

  if (invoice.status === 'paid') {
    return NextResponse.json(
      { error: 'Invoice already paid' },
      { status: 409 },
    );
  }

  const { data: itemsRows, error: itemsErr } = await sb
    .from('invoice_line_items')
    .select('description, quantity, unit_price, amount')
    .eq('invoice_id', invoice.id)
    .order('position', { ascending: true });

  if (itemsErr) {
    console.error('[stripe/checkout] items lookup', itemsErr);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }

  const items = (itemsRows ?? []) as LineItem[];
  let stripeLineItems: Array<{
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string };
    };
  }>;

  if (items.length > 0) {
    stripeLineItems = items.map((li) => {
      const qty = Math.max(1, Math.round(Number(li.quantity ?? 1)));
      const unitDollars = Number(li.unit_price ?? 0);
      const unitCents = Math.round(unitDollars * 100);
      return {
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: unitCents,
          product_data: { name: li.description?.slice(0, 250) || 'Service' },
        },
      };
    });
  } else {
    const total = Number(invoice.total ?? invoice.amount ?? 0);
    if (!total) {
      return NextResponse.json(
        { error: 'Invoice has no line items and no total' },
        { status: 400 },
      );
    }
    stripeLineItems = [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(total * 100),
          product_data: {
            name: invoice.number
              ? `Invoice ${invoice.number}`
              : `Invoice ${invoice.id.slice(0, 8)}`,
          },
        },
      },
    ];
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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    new URL(req.url).origin;

  try {
    const stripe = getStripe();
    // Stable key per (user, invoice) — repeated POSTs from a refreshed page
    // collapse to one Stripe session instead of opening N parallel ones.
    const idempotencyKey = createHash('sha256')
      .update(`invoice:${invoice.id}:${ctx.user.clerk_id}`)
      .digest('hex');
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        line_items: stripeLineItems,
        success_url: `${baseUrl}/portal/invoices/${invoice.id}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/portal/invoices/${invoice.id}/pay/cancel`,
        metadata: { invoice_id: invoice.id },
        payment_intent_data: {
          metadata: { invoice_id: invoice.id },
        },
      },
      { idempotencyKey },
    );

    await sb
      .from('invoices')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', invoice.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout] create session', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}

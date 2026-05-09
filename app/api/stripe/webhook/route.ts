import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    console.warn('[stripe/webhook] STRIPE_SECRET_KEY missing');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 },
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET missing');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 503 },
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[stripe/webhook] signature verify failed:', msg);
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Replay protection — insert-first into stripe_webhook_events keyed on
  // event.id. The unique-violation path acks immediately so Stripe stops
  // retrying. A failure to log is fail-closed (503) so an event is never
  // processed without a row that admins can later inspect.
  const { error: logErr } = await sb.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    status: 'received',
    payload: event as unknown as Record<string, unknown>,
  });
  if (logErr) {
    if ((logErr as { code?: string }).code === '23505') {
      await sb
        .from('stripe_webhook_events')
        .update({ status: 'duplicate' })
        .eq('event_id', event.id)
        .neq('status', 'processed');
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe/webhook] event_log insert', logErr);
    return NextResponse.json({ error: 'event log unavailable' }, { status: 503 });
  }

  try {
    await dispatchEvent(sb, event);
    await sb
      .from('stripe_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error: null })
      .eq('event_id', event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe/webhook] handler error', event.type, msg);
    await sb
      .from('stripe_webhook_events')
      .update({ status: 'failed', error: msg.slice(0, 1000) })
      .eq('event_id', event.id);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

export async function dispatchEvent(sb: Sb, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(sb, event.data.object as Stripe.Checkout.Session);
      return;
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(sb, event.data.object as Stripe.Invoice);
      await writeInvoiceAuditLog(sb, event.data.object as Stripe.Invoice, 'stripe.invoice.paid');
      return;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(sb, event.data.object as Stripe.Invoice);
      await writeInvoiceAuditLog(sb, event.data.object as Stripe.Invoice, 'stripe.invoice.payment_failed');
      return;
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await upsertSubscription(sb, event.data.object as Stripe.Subscription);
      return;
    case 'customer.subscription.deleted':
      await markSubscriptionCanceled(sb, event.data.object as Stripe.Subscription);
      return;
    case 'charge.refunded':
      await handleChargeRefunded(sb, event.data.object as Stripe.Charge);
      return;
    default:
      // Unhandled event types are still logged in stripe_webhook_events;
      // we 200 below so Stripe doesn't retry events we don't act on.
      console.log('[stripe/webhook] unhandled event type', event.type);
      return;
  }
}

type Sb = ReturnType<typeof supabaseAdmin>;

async function handleCheckoutCompleted(sb: Sb, session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) return;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const amountTotalCents = session.amount_total ?? 0;
  const amountDollars = amountTotalCents / 100;
  const paymentMethod = session.payment_method_types?.[0] ?? null;

  const { data: inv } = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) {
    console.warn('[stripe/webhook] invoice not found for session', session.id);
    return;
  }

  await sb
    .from('invoices')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      payment_method_used: paymentMethod,
      paid_at: new Date().toISOString(),
      dunning_status: 'current',
    })
    .eq('id', invoiceId);

  await sb.from('payments').insert({
    invoice_id: invoiceId,
    organization_id: inv.organization_id,
    stripe_payment_intent_id: paymentIntentId,
    amount: amountDollars,
    currency: session.currency ?? 'usd',
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    raw_event: session as unknown as Record<string, unknown>,
  });

  // TODO(phase33): replace with Resend orchestration call.
  await notifyOrgMembers(sb, inv.organization_id, {
    kind: 'payment_received',
    title: 'Payment received',
    body: `Payment of $${amountDollars.toFixed(2)} received for invoice ${invoiceId.slice(0, 8)}.`,
    link: `/portal/invoices/${invoiceId}`,
  });
}

async function handleInvoicePaymentSucceeded(sb: Sb, invoice: Stripe.Invoice) {
  // Stripe-managed invoices (subscriptions). Map to our invoices via stripe_invoice_id.
  if (!invoice.id) return;
  const { data: ourInv } = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();
  if (!ourInv) return;

  const invAny = invoice as unknown as { payment_intent?: string | { id?: string } };
  const piRaw = invAny.payment_intent;
  const piId =
    typeof piRaw === 'string' ? piRaw : piRaw?.id ?? null;
  const amountDollars = (invoice.amount_paid ?? 0) / 100;

  await sb
    .from('invoices')
    .update({
      status: 'paid',
      stripe_payment_intent_id: piId,
      paid_at: new Date().toISOString(),
      dunning_status: 'current',
    })
    .eq('id', ourInv.id);

  await sb.from('payments').insert({
    invoice_id: ourInv.id,
    organization_id: ourInv.organization_id,
    stripe_payment_intent_id: piId,
    amount: amountDollars,
    currency: invoice.currency ?? 'usd',
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    raw_event: invoice as unknown as Record<string, unknown>,
  });
}

async function handleInvoicePaymentFailed(sb: Sb, invoice: Stripe.Invoice) {
  if (!invoice.id) return;
  const { data: ourInv } = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();
  if (!ourInv) return;

  await sb
    .from('invoices')
    .update({ dunning_status: 'reminded_1' })
    .eq('id', ourInv.id);

  // TODO(phase33): trigger Resend "payment failed" email.
  await notifyOrgMembers(sb, ourInv.organization_id, {
    kind: 'payment_failed',
    title: 'Payment failed',
    body: `Payment failed for invoice ${ourInv.id.slice(0, 8)}.`,
    link: `/portal/invoices/${ourInv.id}`,
  });
}

async function upsertSubscription(sb: Sb, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const price = item?.price;
  const priceAmount = price?.unit_amount ?? null;
  const priceCurrency = price?.currency ?? 'usd';
  const intervalValue = price?.recurring?.interval ?? null;

  let orgId: string | null = null;
  const { data: orgRow } = await sb
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (orgRow) orgId = orgRow.id;

  const engagementId = sub.metadata?.engagement_id ?? null;
  const periodEndUnix = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const currentPeriodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  await sb.from('stripe_subscriptions').upsert(
    {
      engagement_id: engagementId,
      organization_id: orgId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      status: sub.status,
      current_period_end: currentPeriodEndIso,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      price_amount: priceAmount,
      price_currency: priceCurrency,
      interval: intervalValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );

  if (engagementId) {
    await sb
      .from('engagements')
      .update({ stripe_subscription_id: sub.id })
      .eq('id', engagementId);
  }
}

async function markSubscriptionCanceled(sb: Sb, sub: Stripe.Subscription) {
  await sb
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);
}

async function handleChargeRefunded(sb: Sb, charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  if (!piId) return;
  await sb
    .from('payments')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', piId);
}

async function notifyOrgMembers(
  sb: Sb,
  orgId: string,
  payload: { kind: string; title: string; body: string; link: string },
) {
  const { data: members } = await sb
    .from('org_memberships')
    .select('user_id')
    .eq('organization_id', orgId);
  if (!members || members.length === 0) return;
  const rows = members
    .filter((m) => m.user_id)
    .map((m) => ({
      user_id: m.user_id,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      link: payload.link,
    }));
  if (rows.length === 0) return;
  await sb.from('notifications').insert(rows);
}

/**
 * Records an audit_log row for an invoice.* event scoped to the org of the
 * Stripe customer. Resolves org via organizations.stripe_customer_id; if the
 * customer is not mapped to any org, the audit row is still written with a
 * null organization_id so the event isn't silently dropped.
 */
async function writeInvoiceAuditLog(sb: Sb, invoice: Stripe.Invoice, action: string) {
  try {
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

    let orgId: string | null = null;
    if (customerId) {
      const { data: orgRow } = await sb
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      orgId = orgRow?.id ?? null;
    }

    const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
    await sb.from('audit_log').insert({
      actor_id: null,
      actor_email: 'stripe-webhook@system',
      action,
      entity_type: 'invoice',
      entity_id: invoice.id ?? null,
      organization_id: orgId,
      after: {
        stripe_invoice_id: invoice.id,
        stripe_customer_id: customerId,
        amount_cents: amountCents,
        currency: invoice.currency ?? 'usd',
        status: invoice.status,
      },
    });
  } catch (err) {
    console.error('[stripe/webhook] audit log insert failed', action, err);
    // never block the webhook on audit failures
  }
}

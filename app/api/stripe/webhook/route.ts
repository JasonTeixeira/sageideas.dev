import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { captureLead } from '@/lib/leads/capture';
import { fulfillAcademyCheckout } from '@/lib/academy/fulfillment';
import {
  upsertAcademyMembershipFromSubscription,
  cancelAcademyMembership,
} from '@/lib/academy/membership';
import {
  syncDiscordPremiumFromCheckout,
  syncDiscordPremiumFromSubscription,
} from '@/lib/discord/premium';
import {
  assertSupabaseSuccess,
  classifyWebhookClaimOutcome,
  deriveRefundStatus,
  isApplicationOwnedRefundMetadata,
} from '@/lib/billing/integrity';

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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  let claimAction;
  try {
    const claimResult = await sb.rpc('claim_stripe_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown as Record<string, unknown>,
    });
    claimAction = classifyWebhookClaimOutcome(
      assertSupabaseSuccess(claimResult, 'Stripe webhook event claim'),
    );
  } catch (error) {
    console.error('[stripe/webhook] event claim', error);
    return NextResponse.json({ error: 'Event log unavailable' }, { status: 503 });
  }

  if (claimAction === 'acknowledge') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claimAction === 'retry_later') {
    return NextResponse.json({ error: 'Event already processing' }, { status: 409 });
  }
  if (claimAction !== 'process') {
    return NextResponse.json({ error: 'Event claim failed' }, { status: 503 });
  }

  try {
    await dispatchEvent(sb, event, event.id);
    const completionResult = await sb
      .from('stripe_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error: null })
      .eq('event_id', event.id);
    assertSupabaseSuccess(completionResult, 'Stripe webhook completion persistence');
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe/webhook] handler error', event.type, msg);
    const failureResult = await sb
      .from('stripe_webhook_events')
      .update({ status: 'failed', error: msg.slice(0, 1000) })
      .eq('event_id', event.id);
    try {
      assertSupabaseSuccess(failureResult, 'Stripe webhook failure persistence');
    } catch (persistenceError) {
      console.error('[stripe/webhook] failure persistence', persistenceError);
    }
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

export async function dispatchEvent(sb: Sb, event: Stripe.Event, eventId: string): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(sb, event.data.object as Stripe.Checkout.Session, eventId);
      return;
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(sb, event.data.object as Stripe.Invoice, eventId);
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

async function handleCheckoutCompleted(
  sb: Sb,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  // Service self-checkout (kind='service'): capture lead and return — no invoice to update.
  if (session.metadata?.kind === 'service') {
    const detail = `Purchased service: ${session.metadata.slug ?? 'unknown'}`;
    await persistCheckoutFulfillment(sb, session, 'service', detail, {
      slug: session.metadata.slug,
    });
    await captureLead({
      source: 'checkout',
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? null,
      detail,
      amountCents: session.amount_total ?? null,
      metadata: { slug: session.metadata.slug, sessionId: session.id },
    });
    return;
  }

  // Care subscription self-checkout (kind='care'): capture lead and return.
  // The subscription record itself is written by the customer.subscription.created event
  // (upsertSubscription) — that fires separately and is idempotent.
  if (session.metadata?.kind === 'care') {
    const detail = `Care subscription: ${session.metadata.tier_slug ?? 'unknown'}`;
    await persistCheckoutFulfillment(sb, session, 'care', detail, {
      tier_slug: session.metadata.tier_slug,
      recurring: true,
    });
    await captureLead({
      source: 'checkout',
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? null,
      detail,
      amountCents: session.amount_total ?? null,
      metadata: {
        tier_slug: session.metadata.tier_slug,
        sessionId: session.id,
        recurring: true,
      },
    });
    return;
  }

  if (session.metadata?.kind === 'academy') {
    await fulfillAcademyCheckout(sb, session);
    return;
  }

  // All-access Academy membership (subscription). Grant access immediately by
  // retrieving the subscription and upserting — the customer.subscription.created
  // event also fires and upserts the same row idempotently.
  if (session.metadata?.kind === 'academy_allaccess') {
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (subId) {
      const sub = await getStripe().subscriptions.retrieve(subId);
      await upsertAcademyMembershipFromSubscription(sb, sub);
    }
    return;
  }

  if (session.metadata?.kind === 'discord_premium') {
    await syncDiscordPremiumFromCheckout(session);
    return;
  }

  // Invoice-linked checkout (kind=undefined / 'invoice').
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) return;

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const amountTotalCents = session.amount_total ?? 0;
  const amountDollars = amountTotalCents / 100;
  const paymentMethod = session.payment_method_types?.[0] ?? null;

  const invoiceLookup = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('id', invoiceId)
    .maybeSingle();
  const inv = assertSupabaseSuccess(invoiceLookup, 'checkout invoice lookup');
  if (!inv) {
    console.warn('[stripe/webhook] invoice not found for session', session.id);
    return;
  }

  const invoiceUpdate = await sb
    .from('invoices')
    .update({
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      payment_method_used: paymentMethod,
      paid_at: new Date().toISOString(),
      dunning_status: 'current',
    })
    .eq('id', invoiceId);
  assertSupabaseSuccess(invoiceUpdate, 'checkout invoice payment update');

  await upsertPaymentReceipt(sb, {
    invoice_id: invoiceId,
    organization_id: inv.organization_id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_event_id: eventId,
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

async function persistCheckoutFulfillment(
  sb: Sb,
  session: Stripe.Checkout.Session,
  kind: 'service' | 'care',
  detail: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null;
  const result = await sb.from('checkout_fulfillments').upsert(
    {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_subscription_id: subscriptionId,
      kind,
      status: 'completed',
      email: session.customer_details?.email ?? session.customer_email ?? null,
      name: session.customer_details?.name ?? null,
      detail,
      amount_cents: session.amount_total ?? null,
      currency: session.currency ?? 'usd',
      metadata,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_checkout_session_id' },
  );
  assertSupabaseSuccess(result, `${kind} checkout fulfillment persistence`);
}

async function handleInvoicePaymentSucceeded(
  sb: Sb,
  invoice: Stripe.Invoice,
  eventId: string,
) {
  if (!invoice.id) return;
  const paidInvoicePayment = invoice.payments?.data.find((payment) => payment.status === 'paid')
    ?? invoice.payments?.data[0];
  const currentPaymentIntent = paidInvoicePayment?.payment.payment_intent;
  const legacyPaymentIntent = (invoice as unknown as {
    payment_intent?: string | { id?: string };
  }).payment_intent;
  const piRaw = currentPaymentIntent ?? legacyPaymentIntent;
  const piId = typeof piRaw === 'string' ? piRaw : piRaw?.id ?? null;
  const amountDollars = (invoice.amount_paid ?? 0) / 100;

  const subscriptionMetadata = invoice.parent?.subscription_details?.metadata;
  const subscriptionKind = subscriptionMetadata?.kind;
  if (['care', 'discord_premium', 'academy_allaccess'].includes(subscriptionKind ?? '')) {
    if (!piId) {
      throw new Error(`subscription invoice ${invoice.id} has no payment intent`);
    }
    await upsertPaymentReceipt(sb, {
      invoice_id: null,
      organization_id: null,
      stripe_payment_intent_id: piId,
      stripe_event_id: eventId,
      amount: amountDollars,
      currency: invoice.currency ?? 'usd',
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      raw_event: invoice as unknown as Record<string, unknown>,
    });
  }

  // Stripe-managed invoices tied to a Studio invoice are reconciled by id.
  const invoiceLookup = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();
  const ourInv = assertSupabaseSuccess(invoiceLookup, 'Stripe invoice lookup');
  if (!ourInv) return;

  const invoiceUpdate = await sb
    .from('invoices')
    .update({
      status: 'paid',
      stripe_payment_intent_id: piId,
      paid_at: new Date().toISOString(),
      dunning_status: 'current',
    })
    .eq('id', ourInv.id);
  assertSupabaseSuccess(invoiceUpdate, 'Stripe invoice payment update');

  await upsertPaymentReceipt(sb, {
    invoice_id: ourInv.id,
    organization_id: ourInv.organization_id,
    stripe_payment_intent_id: piId,
    stripe_event_id: eventId,
    amount: amountDollars,
    currency: invoice.currency ?? 'usd',
    status: 'succeeded',
    paid_at: new Date().toISOString(),
    raw_event: invoice as unknown as Record<string, unknown>,
  });
}

async function handleInvoicePaymentFailed(sb: Sb, invoice: Stripe.Invoice) {
  if (!invoice.id) return;
  const invoiceLookup = await sb
    .from('invoices')
    .select('id, organization_id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();
  const ourInv = assertSupabaseSuccess(invoiceLookup, 'failed Stripe invoice lookup');
  if (!ourInv) return;

  const invoiceUpdate = await sb
    .from('invoices')
    .update({ dunning_status: 'reminded_1' })
    .eq('id', ourInv.id);
  assertSupabaseSuccess(invoiceUpdate, 'failed Stripe invoice dunning update');

  // TODO(phase33): trigger Resend "payment failed" email.
  await notifyOrgMembers(sb, ourInv.organization_id, {
    kind: 'payment_failed',
    title: 'Payment failed',
    body: `Payment failed for invoice ${ourInv.id.slice(0, 8)}.`,
    link: `/portal/invoices/${ourInv.id}`,
  });
}

async function upsertSubscription(sb: Sb, sub: Stripe.Subscription) {
  // All-access Academy memberships live in their own user-keyed table, not the
  // org/engagement stripe_subscriptions table. Route them and return early.
  if (sub.metadata?.kind === 'academy_allaccess') {
    await upsertAcademyMembershipFromSubscription(sb, sub);
    return;
  }

  await syncDiscordPremiumFromSubscription(sub);

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const price = item?.price;
  const priceAmount = price?.unit_amount ?? null;
  const priceCurrency = price?.currency ?? 'usd';
  const intervalValue = price?.recurring?.interval ?? null;

  let orgId: string | null = null;
  const organizationLookup = await sb
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  const orgRow = assertSupabaseSuccess(organizationLookup, 'subscription organization lookup');
  if (orgRow) orgId = orgRow.id;

  const engagementId = sub.metadata?.engagement_id ?? null;
  const periodEndUnix = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  const currentPeriodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

  const subscriptionPersistence = await sb.from('stripe_subscriptions').upsert(
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
  assertSupabaseSuccess(subscriptionPersistence, 'Stripe subscription persistence');

  if (engagementId) {
    const engagementPersistence = await sb
      .from('engagements')
      .update({ stripe_subscription_id: sub.id })
      .eq('id', engagementId);
    assertSupabaseSuccess(engagementPersistence, 'subscription engagement persistence');
  }
}

async function markSubscriptionCanceled(sb: Sb, sub: Stripe.Subscription) {
  if (sub.metadata?.kind === 'academy_allaccess') {
    await cancelAcademyMembership(sb, sub.id);
    return;
  }

  await syncDiscordPremiumFromSubscription(sub);

  const cancellationPersistence = await sb
    .from('stripe_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);
  assertSupabaseSuccess(cancellationPersistence, 'Stripe subscription cancellation');
}

async function handleChargeRefunded(sb: Sb, charge: Stripe.Charge) {
  const paymentIntent = charge.payment_intent;
  const piId = typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id ?? null;
  if (!piId) return;
  const paymentLookup = await sb
    .from('payments')
    .select('id, invoice_id, amount')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle();
  let payment = assertSupabaseSuccess(paymentLookup, 'refunded payment lookup');

  if (!payment) {
    await upsertPaymentReceipt(sb, {
      invoice_id: null,
      organization_id: null,
      stripe_payment_intent_id: piId,
      stripe_event_id: `refund:${charge.id}`,
      amount: Math.max(0, charge.amount ?? 0) / 100,
      currency: charge.currency ?? 'usd',
      status: 'succeeded',
      paid_at: new Date((charge.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      raw_event: charge as unknown as Record<string, unknown>,
    });
    const recoveredLookup = await sb
      .from('payments')
      .select('id, invoice_id, amount')
      .eq('stripe_payment_intent_id', piId)
      .maybeSingle();
    payment = assertSupabaseSuccess(recoveredLookup, 'refund receipt recovery');
    if (!payment) throw new Error('refund receipt could not be recovered');
  }

  const amountCents = payment
    ? Math.max(0, Math.round(Number(payment.amount ?? 0) * 100))
    : Math.max(0, charge.amount ?? 0);
  const amountRefundedCents = Math.max(0, charge.amount_refunded ?? 0);
  const status = deriveRefundStatus({
    amountCents,
    amountRefundedCents,
    fullyRefunded: charge.refunded,
  });
  const paymentUpdate = await sb
    .from('payments')
    .update({ status, refunded_amount: amountRefundedCents / 100 })
    .eq('id', payment.id);
  assertSupabaseSuccess(paymentUpdate, 'refunded payment update');

  const enrollmentUpdate = await sb
    .from('academy_enrollments')
    .update({
      refunded_amount_cents: amountRefundedCents,
      ...(status === 'refunded'
        ? { status: 'refunded', updated_at: new Date().toISOString() }
        : {}),
    })
    .eq('stripe_payment_intent_id', piId)
    .select('id');
  const enrollmentRows = assertSupabaseSuccess(
    enrollmentUpdate,
    'refunded Academy enrollment update',
  ) ?? [];
  const enrollmentMatched = enrollmentRows.length > 0;

  const fulfillmentUpdate = await sb
    .from('checkout_fulfillments')
    .update({
      status,
      refunded_amount_cents: amountRefundedCents,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', piId)
    .select('id');
  const fulfillmentRows = assertSupabaseSuccess(
    fulfillmentUpdate,
    'checkout fulfillment refund update',
  ) ?? [];
  const fulfillmentMatched = fulfillmentRows.length > 0;

  const paymentIntentMetadata = paymentIntent && typeof paymentIntent === 'object'
    ? paymentIntent.metadata
    : null;
  if (!enrollmentMatched && !fulfillmentMatched && !payment.invoice_id
      && isApplicationOwnedRefundMetadata(charge.metadata, paymentIntentMetadata)) {
    throw new Error('application-owned refund has no local billing record');
  }

  // A partially_refunded receipt remains attached to a paid invoice; only a
  // full refund revokes the invoice and any one-time Academy entitlement.
  if (status === 'refunded') {
    if (payment?.invoice_id) {
      const invoiceUpdate = await sb
        .from('invoices')
        .update({ status: 'refunded' })
        .eq('id', payment.invoice_id);
      assertSupabaseSuccess(invoiceUpdate, 'refunded invoice update');
    }
  }
}

async function notifyOrgMembers(
  sb: Sb,
  orgId: string,
  payload: { kind: string; title: string; body: string; link: string },
) {
  const memberLookup = await sb
    .from('org_memberships')
    .select('user_id')
    .eq('organization_id', orgId);
  const members = assertSupabaseSuccess(memberLookup, 'billing notification member lookup');
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
  const notificationInsert = await sb.from('notifications').insert(rows);
  assertSupabaseSuccess(notificationInsert, 'billing notification insert');
}

type PaymentReceipt = {
  invoice_id: string | null;
  organization_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_event_id: string;
  amount: number;
  currency: string;
  status: 'succeeded';
  paid_at: string;
  raw_event: Record<string, unknown>;
};

async function upsertPaymentReceipt(sb: Sb, receipt: PaymentReceipt): Promise<void> {
  const result = await sb.rpc('record_stripe_payment_receipt', {
    p_invoice_id: receipt.invoice_id,
    p_organization_id: receipt.organization_id,
    p_payment_intent_id: receipt.stripe_payment_intent_id,
    p_event_id: receipt.stripe_event_id,
    p_amount: receipt.amount,
    p_currency: receipt.currency,
    p_paid_at: receipt.paid_at,
    p_raw_event: receipt.raw_event,
  });
  assertSupabaseSuccess(result, 'payment receipt upsert');
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

import Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { assignRole, removeRole } from './sage-rest';
import { updateDiscordPremium, recordDiscordEvent } from './analytics';

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sageideas.dev').replace(/\/$/, '');
}

export function discordPremiumPriceId(): string | null {
  return process.env.STRIPE_PRICE_DISCORD_PREMIUM ?? process.env.STRIPE_PRICE_ACADEMY_PREMIUM ?? null;
}

export async function createDiscordPremiumCheckout(input: {
  discordUserId: string;
  username: string;
}): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const priceId = discordPremiumPriceId();
  if (!isStripeConfigured() || !priceId) {
    return { ok: false, reason: 'premium_checkout_not_configured' };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteOrigin()}/academy?discord=premium-success`,
    cancel_url: `${siteOrigin()}/academy?discord=premium-cancelled`,
    client_reference_id: input.discordUserId,
    metadata: {
      kind: 'discord_premium',
      discord_user_id: input.discordUserId,
      discord_username: input.username,
    },
    subscription_data: {
      metadata: {
        kind: 'discord_premium',
        discord_user_id: input.discordUserId,
        discord_username: input.username,
      },
    },
  });

  if (!session.url) return { ok: false, reason: 'checkout_url_missing' };
  await recordDiscordEvent({
    eventType: 'premium_checkout_created',
    commandName: 'premium',
    discordUserId: input.discordUserId,
    discordUsername: input.username,
    metadata: { checkout_session_id: session.id, price_id: priceId },
  });
  return { ok: true, url: session.url };
}

export async function syncDiscordPremiumFromCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.kind !== 'discord_premium') return;
  const discordUserId = session.metadata.discord_user_id;
  if (!discordUserId) return;

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const username = session.metadata.discord_username ?? session.customer_details?.name ?? null;

  const premiumAssigned = await assignRole(discordUserId, 'Premium Member');
  const academyAssigned = await assignRole(discordUserId, 'Academy Member');
  if (!premiumAssigned || !academyAssigned) {
    throw new Error('Discord premium roles are not configured');
  }
  await updateDiscordPremium({
    discordUserId,
    username,
    premiumMember: true,
    premiumStatus: 'active',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });
  await recordDiscordEvent({
    eventType: 'premium_role_assigned',
    commandName: 'stripe_webhook',
    discordUserId,
    discordUsername: username,
    metadata: { checkout_session_id: session.id, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId },
  });
}

export async function syncDiscordPremiumFromSubscription(sub: Stripe.Subscription): Promise<void> {
  if (sub.metadata?.kind !== 'discord_premium') return;
  const discordUserId = sub.metadata.discord_user_id;
  if (!discordUserId) return;

  const active = ['active', 'trialing'].includes(sub.status);
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  if (active) {
    const premiumAssigned = await assignRole(discordUserId, 'Premium Member');
    const academyAssigned = await assignRole(discordUserId, 'Academy Member');
    if (!premiumAssigned || !academyAssigned) {
      throw new Error('Discord premium roles are not configured');
    }
  } else {
    await removeRole(discordUserId, 'Premium Member');
  }

  await updateDiscordPremium({
    discordUserId,
    username: sub.metadata.discord_username ?? null,
    premiumMember: active,
    premiumStatus: sub.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
  });
  await recordDiscordEvent({
    eventType: active ? 'premium_role_assigned' : 'premium_role_removed',
    commandName: 'stripe_webhook',
    discordUserId,
    discordUsername: sub.metadata.discord_username ?? null,
    metadata: { stripe_customer_id: customerId, stripe_subscription_id: sub.id, status: sub.status },
  });
}

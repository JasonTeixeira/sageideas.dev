import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/server';

export const STRIPE_API_VERSION = '2026-04-22.dahlia' as const;

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY is not configured');
    this.name = 'StripeNotConfiguredError';
  }
}

let cachedStripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  if (cachedStripe) return cachedStripe;
  cachedStripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return cachedStripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Returns the Stripe customer id for an organization, creating one if needed.
 * Persists the id back to organizations.stripe_customer_id via service role.
 */
export async function getOrCreateCustomer(orgId: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data: org, error } = await sb
    .from('organizations')
    .select('id, name, primary_contact_email, stripe_customer_id')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  if (!org) throw new Error(`Organization ${orgId} not found`);
  if (org.stripe_customer_id) return org.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: org.name ?? undefined,
    email: org.primary_contact_email ?? undefined,
    metadata: { organization_id: org.id },
  });

  const { error: updateError } = await sb
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orgId);
  if (updateError) throw updateError;
  return customer.id;
}

/**
 * Tiny helper for routes — returns either the live key or null. Callers should
 * 503 when null rather than throwing.
 */
export function getPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}

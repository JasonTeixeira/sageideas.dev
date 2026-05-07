// Re-export the Stripe webhook handler under the spec'd path
// `/api/webhooks/stripe`. The original implementation lives at
// `/api/stripe/webhook` and stays the canonical endpoint; this thin
// alias is registered so either URL is accepted.
export { POST, runtime, dynamic } from '@/app/api/stripe/webhook/route';

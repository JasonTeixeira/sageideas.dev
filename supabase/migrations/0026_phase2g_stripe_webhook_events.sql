-- Phase 2G PR-2 — Stripe webhook idempotency + status tracking.
--
-- The legacy stripe_event_log table (phase32_stripe_fields.sql) used
-- columns (id, type, payload, processed_at) but the current webhook
-- handler inserts (event_id, event_type, payload) — silently failing
-- on every delivery. This migration introduces a richer events table
-- that the rewritten handler targets, with explicit status tracking
-- so failed deliveries are visible to admins and retryable.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id      text PRIMARY KEY,
  event_type    text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  status        text NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','processed','failed','duplicate')),
  error         text,
  payload       jsonb
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type_received
  ON public.stripe_webhook_events (event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events (status, received_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role inserts/updates (webhook handler runs as service role).
-- No anon/authenticated INSERT policy — Stripe events must never be
-- forgeable from the browser.

DROP POLICY IF EXISTS stripe_webhook_events_admin_read ON public.stripe_webhook_events;
CREATE POLICY stripe_webhook_events_admin_read ON public.stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

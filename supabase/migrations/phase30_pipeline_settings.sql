-- =============================================================================
-- Phase 30 — Pipeline + capacity settings
-- =============================================================================
-- Adds default blended rate, capacity hours, per-user capacity override, and
-- a column tracking when a status report was last sent for each engagement.
-- Idempotent. Phase 30b will use these for profitability/workload reporting.
-- =============================================================================

alter table public.studio_settings
  add column if not exists default_blended_rate numeric not null default 150;

alter table public.studio_settings
  add column if not exists weekly_capacity_hours numeric not null default 40;

alter table public.profiles
  add column if not exists weekly_capacity_hours numeric;

alter table public.engagements
  add column if not exists status_report_last_sent_at timestamptz;

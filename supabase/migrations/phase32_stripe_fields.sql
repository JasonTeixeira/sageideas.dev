-- =============================================================================
-- Phase 32 — Stripe invoicing + subscriptions + dunning
-- =============================================================================
-- Adds the Stripe-related columns to invoices/organizations/engagements,
-- creates stripe_subscriptions, stripe_event_log (webhook idempotency), and
-- a dunning_status column on invoices. Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. invoices: add Stripe + dunning fields
-- -----------------------------------------------------------------------------
-- stripe_invoice_id already exists (schema_part1_tables.sql). Add the rest.
alter table public.invoices
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists payment_method_used text,
  add column if not exists dunning_status text not null default 'current'
    check (dunning_status in (
      'current','grace','reminded_1','reminded_2','final_notice','collections','written_off'
    ));

create index if not exists idx_invoices_stripe_session
  on public.invoices(stripe_checkout_session_id);
create index if not exists idx_invoices_dunning_status
  on public.invoices(dunning_status);

-- -----------------------------------------------------------------------------
-- 2. organizations: stripe_customer_id
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists stripe_customer_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_stripe_customer_id_key'
  ) then
    alter table public.organizations
      add constraint organizations_stripe_customer_id_key unique (stripe_customer_id);
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 3. engagements: subscription wiring
-- -----------------------------------------------------------------------------
alter table public.engagements
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_cadence text
    check (billing_cadence in ('one_time','monthly','quarterly','annual'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'engagements_stripe_subscription_id_key'
  ) then
    alter table public.engagements
      add constraint engagements_stripe_subscription_id_key unique (stripe_subscription_id);
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 4. stripe_subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references public.engagements(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_customer_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  price_amount integer,
  price_currency text default 'usd',
  interval text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stripe_subs_org on public.stripe_subscriptions(organization_id);
create index if not exists idx_stripe_subs_engagement on public.stripe_subscriptions(engagement_id);

drop trigger if exists stripe_subscriptions_updated_at on public.stripe_subscriptions;
create trigger stripe_subscriptions_updated_at before update on public.stripe_subscriptions
  for each row execute function public.set_updated_at();

alter table public.stripe_subscriptions enable row level security;

drop policy if exists "stripe_subs_admin_all" on public.stripe_subscriptions;
create policy "stripe_subs_admin_all" on public.stripe_subscriptions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "stripe_subs_members_read" on public.stripe_subscriptions;
create policy "stripe_subs_members_read" on public.stripe_subscriptions
  for select to authenticated
  using (public.is_org_member(organization_id));

-- -----------------------------------------------------------------------------
-- 5. stripe_event_log (webhook idempotency)
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_event_log (
  id text primary key,
  type text,
  payload jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_event_log_type on public.stripe_event_log(type);

alter table public.stripe_event_log enable row level security;

-- Service role only — no policies for authenticated users.
drop policy if exists "stripe_event_log_admin_read" on public.stripe_event_log;
create policy "stripe_event_log_admin_read" on public.stripe_event_log
  for select to authenticated
  using (public.is_admin(auth.uid()));

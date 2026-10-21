\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid
);

create table public.org_memberships (
  user_id uuid not null,
  organization_id uuid not null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  payload jsonb
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  engagement_id uuid,
  number text,
  status text,
  amount_due numeric(12,2),
  amount_paid numeric(12,2),
  currency text default 'usd',
  total numeric,
  subtotal numeric,
  tax numeric default 0,
  due_date timestamptz,
  paid_at timestamptz,
  notes text,
  sent_at timestamptz,
  payment_method_used text,
  dunning_status text not null default 'current',
  reminder_count integer default 0,
  last_reminder_at timestamptz
);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null,
  amount numeric not null,
  position integer default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  organization_id uuid,
  stripe_payment_intent_id text unique,
  amount numeric not null,
  currency text default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz,
  failure_reason text,
  raw_event jsonb
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed', 'duplicate')),
  error text,
  payload jsonb
);

create table public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'refunded', 'revoked')),
  stripe_payment_intent_id text
);

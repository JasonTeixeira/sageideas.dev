-- =============================================================================
-- Phase 33 — Email log + Resend event tracking
-- =============================================================================
-- Adds an append-mostly log of every email send attempt (queued, sent, failed,
-- bounced, complained). Used by the email sender wrapper and updated by the
-- Resend webhook receiver.
--
-- Idempotent. Service role writes; admin reads. No anon access.
-- =============================================================================

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient text not null,
  subject text,
  template_key text,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','bounced','complained','delivered','opened','clicked')),
  provider_message_id text,
  error text,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_email_log_recipient on public.email_log(recipient);
create index if not exists idx_email_log_user on public.email_log(user_id);
create index if not exists idx_email_log_provider_msg on public.email_log(provider_message_id);
create index if not exists idx_email_log_status_sent on public.email_log(status, sent_at desc);

alter table public.email_log enable row level security;

drop policy if exists "email_log_admin_read" on public.email_log;
create policy "email_log_admin_read" on public.email_log
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- Service role bypasses RLS automatically; no explicit policy needed for writes.

-- Helper: latest email status for a recipient (admin-only via SECURITY INVOKER + RLS).
create or replace function public.email_log_latest_for(p_recipient text)
returns table (
  id uuid,
  status text,
  subject text,
  template_key text,
  sent_at timestamptz,
  provider_message_id text
)
language sql
stable
security invoker
set search_path = public
as $$
  select id, status, subject, template_key, sent_at, provider_message_id
  from public.email_log
  where recipient = p_recipient
  order by sent_at desc
  limit 25;
$$;

revoke all on function public.email_log_latest_for(text) from public;
grant execute on function public.email_log_latest_for(text) to authenticated, service_role;

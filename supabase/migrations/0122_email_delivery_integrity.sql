-- Canonical email delivery ledger: retry-safe provider sends and honest dead letters.
-- This promotes the legacy email_log definition into the ordered migration chain.

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient text not null,
  subject text,
  template_key text,
  status text not null default 'failed',
  provider_message_id text,
  idempotency_key text,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  error text,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.email_log add column if not exists idempotency_key text;
alter table public.email_log add column if not exists attempt_count integer not null default 0;
alter table public.email_log add column if not exists next_retry_at timestamptz;
alter table public.email_log add column if not exists last_attempt_at timestamptz;

alter table public.email_log drop constraint if exists email_log_status_check;
alter table public.email_log add constraint email_log_status_check check (
  status in (
    'queued', 'processing', 'sent', 'failed', 'dead_lettered',
    'delivered', 'bounced', 'complained', 'unsubscribed', 'opened', 'clicked'
  )
);
alter table public.email_log drop constraint if exists email_log_attempt_count_check;
alter table public.email_log add constraint email_log_attempt_count_check
  check (attempt_count >= 0 and attempt_count <= 100);

create unique index if not exists email_log_idempotency_unique
  on public.email_log(idempotency_key);
create unique index if not exists email_log_provider_message_unique
  on public.email_log(provider_message_id);
create index if not exists email_log_retry_queue_idx
  on public.email_log(status, next_retry_at)
  where status = 'failed';
create index if not exists email_log_dead_letter_idx
  on public.email_log(sent_at desc)
  where status = 'dead_lettered';

alter table public.email_log enable row level security;

drop policy if exists email_log_admin_read on public.email_log;
create policy email_log_admin_read on public.email_log
  for select to authenticated
  using (public.is_admin(auth.uid()));

revoke all on public.email_log from anon, authenticated;
grant select on public.email_log to authenticated;
grant all on public.email_log to service_role;

create table if not exists public.email_webhook_events (
  provider_event_id text primary key,
  event_type text not null,
  provider_message_id text not null,
  status text not null default 'processing' check (status in ('processing', 'processed')),
  lease_token uuid not null,
  lease_expires_at timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

alter table public.email_webhook_events enable row level security;
revoke all on public.email_webhook_events from anon, authenticated;
grant all on public.email_webhook_events to service_role;

create or replace function public.claim_email_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_provider_message_id text,
  p_lease_token uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer := 0;
  current_event public.email_webhook_events%rowtype;
begin
  insert into public.email_webhook_events (
    provider_event_id, event_type, provider_message_id, lease_token, lease_expires_at
  ) values (
    p_provider_event_id, p_event_type, p_provider_message_id, p_lease_token, now() + interval '5 minutes'
  ) on conflict (provider_event_id) do nothing;
  get diagnostics claimed = row_count;
  if claimed = 1 then return 'process'; end if;

  select * into current_event
  from public.email_webhook_events
  where provider_event_id = p_provider_event_id
  for update;

  if current_event.status = 'processed' then return 'duplicate'; end if;
  if current_event.lease_expires_at > now() then return 'retry_later'; end if;

  update public.email_webhook_events set
    lease_token = p_lease_token,
    lease_expires_at = now() + interval '5 minutes',
    attempt_count = attempt_count + 1,
    last_error = null
  where provider_event_id = p_provider_event_id;
  return 'process';
end;
$$;

revoke all on function public.claim_email_webhook_event(text, text, text, uuid) from public;
grant execute on function public.claim_email_webhook_event(text, text, text, uuid) to service_role;

-- Billing integrity: durable Stripe event claims, refund-aware receipts, and
-- atomic manual invoice settlement. All mutation functions are service-role
-- only; browser clients retain no execute permission.

alter table public.stripe_webhook_events
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz not null default now();

alter table public.payments
  add column if not exists stripe_event_id text,
  add column if not exists refunded_amount numeric not null default 0;

alter table public.academy_enrollments
  add column if not exists refunded_amount_cents integer not null default 0
  check (refunded_amount_cents >= 0);

alter table public.invoices
  add column if not exists issue_date date;

create table if not exists public.checkout_fulfillments (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  kind text not null check (kind in ('service', 'care')),
  status text not null default 'completed'
    check (status in ('completed', 'partially_refunded', 'refunded')),
  email text,
  name text,
  detail text not null,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0),
  currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkout_fulfillments enable row level security;

create unique index if not exists checkout_fulfillments_payment_intent_unique
  on public.checkout_fulfillments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists payments_stripe_event_id_unique
  on public.payments (stripe_event_id)
  where stripe_event_id is not null;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed', 'partially_refunded', 'refunded'));

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_stale_after_seconds integer default 300
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_last_attempt_at timestamptz;
  v_stale_after_seconds integer := greatest(30, least(coalesce(p_stale_after_seconds, 300), 3600));
begin
  if nullif(btrim(p_event_id), '') is null
     or nullif(btrim(p_event_type), '') is null
     or p_payload is null then
    raise exception 'invalid Stripe webhook claim';
  end if;

  insert into public.stripe_webhook_events (
    event_id, event_type, status, payload, attempt_count, last_attempt_at
  ) values (
    p_event_id, p_event_type, 'received', p_payload, 1, now()
  )
  on conflict (event_id) do nothing;

  if found then
    return 'claimed';
  end if;

  select status, last_attempt_at
    into v_status, v_last_attempt_at
    from public.stripe_webhook_events
   where event_id = p_event_id
   for update;

  if v_status = 'processed' then
    return 'processed';
  end if;

  if v_status = 'received'
     and v_last_attempt_at > now() - make_interval(secs => v_stale_after_seconds) then
    return 'in_progress';
  end if;

  if v_status in ('failed', 'duplicate')
     or v_status = 'received' then
    update public.stripe_webhook_events
       set event_type = p_event_type,
           status = 'received',
           payload = p_payload,
           processed_at = null,
           error = null,
           attempt_count = attempt_count + 1,
           last_attempt_at = now()
     where event_id = p_event_id;
    return 'claimed';
  end if;

  return 'unclaimable';
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text, jsonb, integer) from public;
revoke all on function public.claim_stripe_webhook_event(text, text, jsonb, integer) from anon;
revoke all on function public.claim_stripe_webhook_event(text, text, jsonb, integer) from authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text, jsonb, integer) to service_role;

create or replace function public.record_stripe_payment_receipt(
  p_invoice_id uuid,
  p_organization_id uuid,
  p_payment_intent_id text,
  p_event_id text,
  p_amount numeric,
  p_currency text,
  p_paid_at timestamptz,
  p_raw_event jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_currency text := lower(coalesce(nullif(btrim(p_currency), ''), 'usd'));
begin
  if nullif(btrim(p_event_id), '') is null then raise exception 'event id is required'; end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000 then
    raise exception 'payment amount is invalid';
  end if;
  if v_currency !~ '^[a-z]{3}$' then raise exception 'payment currency is invalid'; end if;

  if nullif(btrim(p_payment_intent_id), '') is not null then
    insert into public.payments (
      invoice_id, organization_id, stripe_payment_intent_id, stripe_event_id,
      amount, currency, status, paid_at, raw_event
    ) values (
      p_invoice_id, p_organization_id, p_payment_intent_id, p_event_id,
      p_amount, v_currency, 'succeeded', coalesce(p_paid_at, now()), p_raw_event
    )
    on conflict (stripe_payment_intent_id) do update
      set invoice_id = coalesce(excluded.invoice_id, public.payments.invoice_id),
          organization_id = coalesce(excluded.organization_id, public.payments.organization_id),
          stripe_event_id = excluded.stripe_event_id,
          amount = excluded.amount,
          currency = excluded.currency,
          status = case
            when public.payments.status in ('partially_refunded', 'refunded')
              then public.payments.status
            else 'succeeded'
          end,
          paid_at = excluded.paid_at,
          raw_event = excluded.raw_event
    returning id into v_payment_id;
  else
    insert into public.payments (
      invoice_id, organization_id, stripe_payment_intent_id, stripe_event_id,
      amount, currency, status, paid_at, raw_event
    ) values (
      p_invoice_id, p_organization_id, null, p_event_id,
      p_amount, v_currency, 'succeeded', coalesce(p_paid_at, now()), p_raw_event
    )
    on conflict (stripe_event_id) where stripe_event_id is not null do update
      set invoice_id = coalesce(excluded.invoice_id, public.payments.invoice_id),
          organization_id = coalesce(excluded.organization_id, public.payments.organization_id),
          amount = excluded.amount,
          currency = excluded.currency,
          status = case
            when public.payments.status in ('partially_refunded', 'refunded')
              then public.payments.status
            else 'succeeded'
          end,
          paid_at = excluded.paid_at,
          raw_event = excluded.raw_event
    returning id into v_payment_id;
  end if;

  return v_payment_id;
end;
$$;

revoke all on function public.record_stripe_payment_receipt(uuid, uuid, text, text, numeric, text, timestamptz, jsonb) from public;
revoke all on function public.record_stripe_payment_receipt(uuid, uuid, text, text, numeric, text, timestamptz, jsonb) from anon;
revoke all on function public.record_stripe_payment_receipt(uuid, uuid, text, text, numeric, text, timestamptz, jsonb) from authenticated;
grant execute on function public.record_stripe_payment_receipt(uuid, uuid, text, text, numeric, text, timestamptz, jsonb) to service_role;

create or replace function public.record_manual_invoice_payment(
  p_invoice_id uuid,
  p_method text default 'manual',
  p_note text default null,
  p_actor_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
  v_paid_at timestamptz := now();
  v_amount numeric;
  v_payment_id uuid;
begin
  select * into v_invoice
    from public.invoices
   where id = p_invoice_id
   for update;

  if not found then
    raise exception 'invoice not found';
  end if;

  if v_invoice.status = 'paid' then
    return jsonb_build_object('outcome', 'already_paid', 'invoice_id', p_invoice_id);
  end if;

  if coalesce(v_invoice.status, '') not in ('sent', 'open', 'overdue') then
    raise exception 'invoice is not payable from status %', v_invoice.status;
  end if;

  v_amount := coalesce(v_invoice.total, v_invoice.amount_due, 0);
  if v_amount <= 0 then
    raise exception 'invoice amount must be positive';
  end if;

  insert into public.payments (
    invoice_id,
    organization_id,
    amount,
    currency,
    status,
    paid_at,
    failure_reason,
    raw_event
  ) values (
    p_invoice_id,
    v_invoice.organization_id,
    v_amount,
    'usd',
    'succeeded',
    v_paid_at,
    null,
    jsonb_build_object(
      'manual', true,
      'note', nullif(left(coalesce(p_note, ''), 2000), ''),
      'by', nullif(left(coalesce(p_actor_email, ''), 320), '')
    )
  )
  returning id into v_payment_id;

  update public.invoices
     set status = 'paid',
         paid_at = v_paid_at,
         payment_method_used = left(coalesce(nullif(p_method, ''), 'manual'), 50),
         dunning_status = 'current'
   where id = p_invoice_id;

  return jsonb_build_object(
    'outcome', 'recorded',
    'invoice_id', p_invoice_id,
    'payment_id', v_payment_id,
    'paid_at', v_paid_at
  );
end;
$$;

revoke all on function public.record_manual_invoice_payment(uuid, text, text, text) from public;
revoke all on function public.record_manual_invoice_payment(uuid, text, text, text) from anon;
revoke all on function public.record_manual_invoice_payment(uuid, text, text, text) from authenticated;
grant execute on function public.record_manual_invoice_payment(uuid, text, text, text) to service_role;

create or replace function public.create_invoice_with_line_items(
  p_organization_id uuid,
  p_engagement_id uuid,
  p_number text,
  p_issue_date date,
  p_due_date timestamptz,
  p_tax_pct numeric,
  p_notes text,
  p_send_now boolean,
  p_line_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice_id uuid;
  v_organization_id uuid := p_organization_id;
  v_engagement_organization_id uuid;
  v_item jsonb;
  v_description text;
  v_quantity numeric;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_tax numeric;
  v_total numeric;
  v_position integer := 0;
  v_status text := case when coalesce(p_send_now, false) then 'sent' else 'draft' end;
begin
  if p_engagement_id is not null then
    select organization_id into v_engagement_organization_id
      from public.engagements
     where id = p_engagement_id;
    if not found then
      raise exception 'engagement not found';
    end if;
    if v_organization_id is null then
      v_organization_id := v_engagement_organization_id;
    elsif v_engagement_organization_id is distinct from v_organization_id then
      raise exception 'engagement does not belong to organization';
    end if;
  end if;

  if v_organization_id is null then
    raise exception 'organization is required';
  end if;
  if p_line_items is null
     or jsonb_typeof(p_line_items) <> 'array'
     or jsonb_array_length(p_line_items) < 1
     or jsonb_array_length(p_line_items) > 100 then
    raise exception 'line_items must contain between 1 and 100 rows';
  end if;
  if coalesce(p_tax_pct, 0) < 0 or coalesce(p_tax_pct, 0) > 100 then
    raise exception 'tax percentage must be between 0 and 100';
  end if;

  for v_item in select value from jsonb_array_elements(p_line_items)
  loop
    v_description := btrim(coalesce(v_item ->> 'description', ''));
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 1);
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, 0);
    if v_description = '' or length(v_description) > 500 then
      raise exception 'line-item description is invalid';
    end if;
    if v_quantity <= 0 or v_quantity > 100000 then
      raise exception 'line-item quantity is invalid';
    end if;
    if v_unit_price < 0 or v_unit_price > 1000000 then
      raise exception 'line-item unit price is invalid';
    end if;
    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
  end loop;

  v_tax := round(v_subtotal * (coalesce(p_tax_pct, 0) / 100), 2);
  v_total := v_subtotal + v_tax;

  insert into public.invoices (
    engagement_id,
    organization_id,
    number,
    status,
    amount_due,
    amount_paid,
    currency,
    subtotal,
    tax,
    total,
    issue_date,
    due_date,
    notes,
    sent_at
  ) values (
    p_engagement_id,
    v_organization_id,
    nullif(left(btrim(coalesce(p_number, '')), 64), ''),
    v_status,
    v_total,
    0,
    'usd',
    v_subtotal,
    v_tax,
    v_total,
    p_issue_date,
    p_due_date,
    nullif(left(coalesce(p_notes, ''), 5000), ''),
    case when v_status = 'sent' then now() else null end
  )
  returning id into v_invoice_id;

  for v_item in select value from jsonb_array_elements(p_line_items)
  loop
    v_description := btrim(v_item ->> 'description');
    v_quantity := coalesce((v_item ->> 'quantity')::numeric, 1);
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, 0);
    insert into public.invoice_line_items (
      invoice_id, description, quantity, unit_price, amount, position
    ) values (
      v_invoice_id,
      v_description,
      v_quantity,
      v_unit_price,
      v_quantity * v_unit_price,
      v_position
    );
    v_position := v_position + 1;
  end loop;

  return jsonb_build_object(
    'id', v_invoice_id,
    'number', nullif(left(btrim(coalesce(p_number, '')), 64), ''),
    'status', v_status,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total
  );
end;
$$;

revoke all on function public.create_invoice_with_line_items(uuid, uuid, text, date, timestamptz, numeric, text, boolean, jsonb) from public;
revoke all on function public.create_invoice_with_line_items(uuid, uuid, text, date, timestamptz, numeric, text, boolean, jsonb) from anon;
revoke all on function public.create_invoice_with_line_items(uuid, uuid, text, date, timestamptz, numeric, text, boolean, jsonb) from authenticated;
grant execute on function public.create_invoice_with_line_items(uuid, uuid, text, date, timestamptz, numeric, text, boolean, jsonb) to service_role;

create or replace function public.advance_invoice_dunning(
  p_invoice_id uuid,
  p_next_status text,
  p_notify boolean,
  p_title text,
  p_body text,
  p_transitioned_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice record;
begin
  if p_next_status not in (
    'current', 'grace', 'reminded_1', 'reminded_2',
    'final_notice', 'collections', 'written_off'
  ) then
    raise exception 'invalid dunning status';
  end if;

  select organization_id, dunning_status, reminder_count
    into v_invoice
    from public.invoices
   where id = p_invoice_id
   for update;
  if not found then raise exception 'invoice not found'; end if;
  if v_invoice.dunning_status = p_next_status then return 'already_applied'; end if;

  if coalesce(p_notify, false) and v_invoice.organization_id is not null then
    insert into public.notifications (user_id, kind, title, body, link, payload)
    select
      membership.user_id,
      'invoice_dunning',
      left(coalesce(p_title, 'Invoice reminder'), 500),
      left(coalesce(p_body, ''), 5000),
      '/portal/invoices/' || p_invoice_id::text,
      jsonb_build_object('invoiceId', p_invoice_id, 'dunningStatus', p_next_status)
    from public.org_memberships as membership
    where membership.organization_id = v_invoice.organization_id
      and membership.user_id is not null;
  end if;

  update public.invoices
     set dunning_status = p_next_status,
         last_reminder_at = case
           when coalesce(p_notify, false) then coalesce(p_transitioned_at, now())
           else last_reminder_at
         end,
         reminder_count = case
           when coalesce(p_notify, false) then coalesce(reminder_count, 0) + 1
           else reminder_count
         end
   where id = p_invoice_id;

  return 'applied';
end;
$$;

revoke all on function public.advance_invoice_dunning(uuid, text, boolean, text, text, timestamptz) from public;
revoke all on function public.advance_invoice_dunning(uuid, text, boolean, text, text, timestamptz) from anon;
revoke all on function public.advance_invoice_dunning(uuid, text, boolean, text, text, timestamptz) from authenticated;
grant execute on function public.advance_invoice_dunning(uuid, text, boolean, text, text, timestamptz) to service_role;

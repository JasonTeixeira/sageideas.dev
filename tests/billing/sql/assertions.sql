\set ON_ERROR_STOP on

do $$
declare
  v_outcome text;
  v_attempts integer;
  v_org_id uuid := gen_random_uuid();
  v_engagement_id uuid := gen_random_uuid();
  v_invoice jsonb;
  v_invoice_id uuid;
  v_payment jsonb;
  v_count integer;
  v_user_id uuid := gen_random_uuid();
  v_null_status_invoice_id uuid;
  v_rejected boolean := false;
begin
  v_outcome := public.claim_stripe_webhook_event(
    'evt_test', 'checkout.session.completed', '{"id":"evt_test"}'::jsonb
  );
  if v_outcome <> 'claimed' then raise exception 'new event was not claimed: %', v_outcome; end if;

  v_outcome := public.claim_stripe_webhook_event(
    'evt_test', 'checkout.session.completed', '{"id":"evt_test"}'::jsonb
  );
  if v_outcome <> 'in_progress' then raise exception 'concurrent event was not blocked: %', v_outcome; end if;

  update public.stripe_webhook_events set status = 'failed' where event_id = 'evt_test';
  v_outcome := public.claim_stripe_webhook_event(
    'evt_test', 'checkout.session.completed', '{"id":"evt_test"}'::jsonb
  );
  if v_outcome <> 'claimed' then raise exception 'failed event was not reclaimed: %', v_outcome; end if;

  select attempt_count into v_attempts
    from public.stripe_webhook_events where event_id = 'evt_test';
  if v_attempts <> 2 then raise exception 'unexpected attempt count: %', v_attempts; end if;

  update public.stripe_webhook_events set status = 'processed' where event_id = 'evt_test';
  v_outcome := public.claim_stripe_webhook_event(
    'evt_test', 'checkout.session.completed', '{"id":"evt_test"}'::jsonb
  );
  if v_outcome <> 'processed' then raise exception 'processed event was not acknowledged: %', v_outcome; end if;

  if has_function_privilege('anon', 'public.claim_stripe_webhook_event(text,text,jsonb,integer)', 'execute') then
    raise exception 'anon can execute webhook claim';
  end if;
  if has_function_privilege('authenticated', 'public.claim_stripe_webhook_event(text,text,jsonb,integer)', 'execute') then
    raise exception 'authenticated can execute webhook claim';
  end if;
  if not has_function_privilege('service_role', 'public.claim_stripe_webhook_event(text,text,jsonb,integer)', 'execute') then
    raise exception 'service role cannot execute webhook claim';
  end if;

  insert into public.engagements (id, organization_id)
    values (v_engagement_id, v_org_id);
  v_invoice := public.create_invoice_with_line_items(
    v_org_id,
    v_engagement_id,
    'INV-TEST',
    current_date,
    now() + interval '14 days',
    10,
    'integration proof',
    true,
    '[{"description":"Build","quantity":2,"unit_price":100}]'::jsonb
  );
  v_invoice_id := (v_invoice ->> 'id')::uuid;
  if (v_invoice ->> 'total')::numeric <> 220 then
    raise exception 'invoice total was not computed transactionally: %', v_invoice;
  end if;
  select count(*) into v_count from public.invoice_line_items where invoice_id = v_invoice_id;
  if v_count <> 1 then raise exception 'invoice line items missing: %', v_count; end if;

  insert into public.org_memberships (user_id, organization_id) values (v_user_id, v_org_id);
  if public.advance_invoice_dunning(
    v_invoice_id, 'reminded_1', true, 'Past due', 'Please pay', now()
  ) <> 'applied' then raise exception 'dunning transition was not applied'; end if;
  if public.advance_invoice_dunning(
    v_invoice_id, 'reminded_1', true, 'Past due', 'Please pay', now()
  ) <> 'already_applied' then raise exception 'dunning transition was not idempotent'; end if;
  select count(*) into v_count from public.notifications where user_id = v_user_id;
  if v_count <> 1 then raise exception 'dunning notification was not atomic/idempotent: %', v_count; end if;

  v_payment := public.record_manual_invoice_payment(
    v_invoice_id, 'bank_transfer', 'settled', 'admin@example.test'
  );
  if v_payment ->> 'outcome' <> 'recorded' then raise exception 'manual payment failed: %', v_payment; end if;
  v_payment := public.record_manual_invoice_payment(
    v_invoice_id, 'bank_transfer', 'settled', 'admin@example.test'
  );
  if v_payment ->> 'outcome' <> 'already_paid' then raise exception 'manual payment was not idempotent: %', v_payment; end if;
  select count(*) into v_count from public.payments where invoice_id = v_invoice_id;
  if v_count <> 1 then raise exception 'manual payment duplicated: %', v_count; end if;

  update public.payments
     set status = 'partially_refunded', refunded_amount = 20
   where invoice_id = v_invoice_id;
  if not found then raise exception 'partial refund state could not be stored'; end if;

  perform public.record_stripe_payment_receipt(
    null, null, 'pi_late', 'evt_refund_first', 50, 'usd', now(), '{"phase":"refund"}'::jsonb
  );
  update public.payments
     set status = 'partially_refunded', refunded_amount = 10
   where stripe_payment_intent_id = 'pi_late';
  perform public.record_stripe_payment_receipt(
    null, null, 'pi_late', 'evt_payment_late', 50, 'usd', now(), '{"phase":"payment"}'::jsonb
  );
  if (select status from public.payments where stripe_payment_intent_id = 'pi_late')
     <> 'partially_refunded' then
    raise exception 'late payment event downgraded refund state';
  end if;

  if has_function_privilege('anon', 'public.record_stripe_payment_receipt(uuid,uuid,text,text,numeric,text,timestamptz,jsonb)', 'execute') then
    raise exception 'anon can execute payment receipt writer';
  end if;

  insert into public.invoices (organization_id, status, amount_due, total)
    values (v_org_id, null, 10, 10)
    returning id into v_null_status_invoice_id;
  begin
    perform public.record_manual_invoice_payment(
      v_null_status_invoice_id, 'manual', null, 'admin@example.test'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'null-status invoice was payable'; end if;
end;
$$;

select 'billing_sql_integration_green' as result;

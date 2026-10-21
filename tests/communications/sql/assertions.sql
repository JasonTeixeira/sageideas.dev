do $$
declare
  delivery_key text := 'test:weekly:learner-1';
  event_id text := 'msg_test_1';
  lease_one uuid := gen_random_uuid();
  lease_two uuid := gen_random_uuid();
  result text;
begin
  insert into public.email_log (
    recipient, subject, template_key, status, idempotency_key, attempt_count
  ) values (
    'learner@example.com', 'Proof', 'weekly_digest', 'failed', delivery_key, 1
  );

  begin
    insert into public.email_log (
      recipient, subject, template_key, status, idempotency_key, attempt_count
    ) values (
      'learner@example.com', 'Proof duplicate', 'weekly_digest', 'failed', delivery_key, 1
    );
    raise exception 'duplicate idempotency key was accepted';
  exception when unique_violation then
    null;
  end;

  update public.email_log
  set status = 'dead_lettered', attempt_count = 3, next_retry_at = null
  where idempotency_key = delivery_key;

  select public.claim_email_webhook_event(event_id, 'email.delivered', 'email_1', lease_one)
  into result;
  if result <> 'process' then raise exception 'first webhook claim did not process: %', result; end if;

  select public.claim_email_webhook_event(event_id, 'email.delivered', 'email_1', lease_two)
  into result;
  if result <> 'retry_later' then raise exception 'active webhook lease was not protected: %', result; end if;

  update public.email_webhook_events
  set status = 'processed', processed_at = now()
  where provider_event_id = event_id and lease_token = lease_one;

  select public.claim_email_webhook_event(event_id, 'email.delivered', 'email_1', lease_two)
  into result;
  if result <> 'duplicate' then raise exception 'processed webhook was not deduplicated: %', result; end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'email_log_retry_queue_idx'
  ) then raise exception 'retry queue index missing'; end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'email_log_dead_letter_idx'
  ) then raise exception 'dead letter index missing'; end if;
end;
$$;

select 'communications_sql_integration_green' as sentinel;

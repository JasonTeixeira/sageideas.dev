-- Step 4A: durable, append-only receipts from the separately controlled lab
-- evaluator. A trusted pass and its mastery events are committed atomically.

create table if not exists public.academy_lab_evaluations (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  lesson_slug text not null,
  lab_key text not null,
  submission_digest text not null check (submission_digest ~ '^[0-9a-f]{64}$'),
  evaluator_version text not null,
  policy_hash text not null check (policy_hash ~ '^[0-9a-f]{64}$'),
  spec_revision text not null,
  attestation_signature text not null check (attestation_signature ~ '^[0-9a-f]{64}$'),
  verdict text not null check (verdict = 'passed'),
  reason text not null check (reason = 'all_private_cases_passed'),
  tests_passed integer not null check (tests_passed > 0),
  tests_total integer not null check (tests_total > 0 and tests_passed = tests_total),
  duration_ms integer not null check (duration_ms >= 0 and duration_ms <= 30000),
  output_bytes integer not null check (output_bytes >= 0 and output_bytes <= 65536),
  created_at timestamptz not null default now(),
  constraint academy_lab_evaluations_key_matches
    check (lab_key = course_slug || '/' || lesson_slug),
  constraint academy_lab_evaluations_submission_once
    unique (user_id, lab_key, submission_digest, evaluator_version, policy_hash, spec_revision)
);

create index if not exists academy_lab_evaluations_user_created_idx
  on public.academy_lab_evaluations (user_id, created_at desc);

alter table public.academy_lab_evaluations enable row level security;

drop policy if exists academy_lab_evaluations_own_read on public.academy_lab_evaluations;
create policy academy_lab_evaluations_own_read on public.academy_lab_evaluations
  for select to authenticated using (user_id = auth.uid());

revoke all on public.academy_lab_evaluations from public, anon, authenticated;
grant select on public.academy_lab_evaluations to authenticated;

-- Append-only even for elevated callers. A future retention/deletion policy must
-- deliberately replace this trigger; the auth.users cascade is also blocked.
create or replace function public.prevent_academy_lab_evaluation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'academy_lab_evaluations is append-only';
end;
$$;

drop trigger if exists academy_lab_evaluations_append_only on public.academy_lab_evaluations;
create trigger academy_lab_evaluations_append_only
  before update or delete on public.academy_lab_evaluations
  for each row execute function public.prevent_academy_lab_evaluation_mutation();

-- The service-role application calls this only after verifying the evaluator's
-- HMAC response. Authenticated/anonymous roles cannot execute it. The receipt
-- and both evidence events live in one database transaction.
create or replace function public.record_trusted_academy_lab_result(
  p_user_id uuid,
  p_course_slug text,
  p_lesson_slug text,
  p_lab_key text,
  p_evaluation_id uuid,
  p_submission_digest text,
  p_evaluator_version text,
  p_policy_hash text,
  p_spec_revision text,
  p_attestation_signature text,
  p_verdict text,
  p_reason text,
  p_tests_passed integer,
  p_tests_total integer,
  p_duration_ms integer,
  p_output_bytes integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt_id uuid;
begin
  if p_verdict <> 'passed'
    or p_reason <> 'all_private_cases_passed'
    or p_tests_total < 1
    or p_tests_passed <> p_tests_total
    or p_lab_key <> p_course_slug || '/' || p_lesson_slug then
    raise exception 'untrusted lab evaluation rejected';
  end if;

  insert into public.academy_lab_evaluations (
    evaluation_id, user_id, course_slug, lesson_slug, lab_key,
    submission_digest, evaluator_version, policy_hash, spec_revision,
    attestation_signature, verdict, reason, tests_passed, tests_total,
    duration_ms, output_bytes
  ) values (
    p_evaluation_id, p_user_id, p_course_slug, p_lesson_slug, p_lab_key,
    p_submission_digest, p_evaluator_version, p_policy_hash, p_spec_revision,
    p_attestation_signature, p_verdict, p_reason, p_tests_passed, p_tests_total,
    p_duration_ms, p_output_bytes
  )
  on conflict do nothing
  returning id into v_receipt_id;

  if v_receipt_id is null then
    return exists (
      select 1 from public.academy_lab_evaluations
      where user_id = p_user_id
        and lab_key = p_lab_key
        and submission_digest = p_submission_digest
        and evaluator_version = p_evaluator_version
        and policy_hash = p_policy_hash
        and spec_revision = p_spec_revision
    );
  end if;

  insert into public.academy_evidence_events (
    user_id, course_slug, lesson_slug, unit_id, event_type, payload
  ) values
  (
    p_user_id, p_course_slug, p_lesson_slug, p_lesson_slug, 'lab_verified',
    jsonb_build_object(
      'labEvaluationId', p_evaluation_id,
      'evaluatorVersion', p_evaluator_version,
      'policyHash', p_policy_hash,
      'specRevision', p_spec_revision,
      'submissionDigest', p_submission_digest,
      'trust', 'controlled_evaluator'
    )
  ),
  (
    p_user_id, p_course_slug, p_lesson_slug, p_lesson_slug, 'sprint_artifact_created',
    jsonb_build_object(
      'labEvaluationId', p_evaluation_id,
      'trust', 'controlled_evaluator'
    )
  );

  return true;
end;
$$;

revoke execute on function public.record_trusted_academy_lab_result(
  uuid, text, text, text, uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.record_trusted_academy_lab_result(
  uuid, text, text, text, uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer
) to service_role;

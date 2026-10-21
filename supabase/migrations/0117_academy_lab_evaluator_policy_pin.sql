-- Step 4A hardening: forward-only policy pin for databases that may already
-- have applied 0116. Unknown or stale evaluator policies cannot mint mastery.

alter table public.academy_lab_evaluations
  drop constraint if exists academy_lab_evaluations_policy_hash_check;

alter table public.academy_lab_evaluations
  drop constraint if exists academy_lab_evaluations_evaluator_version_pin;

alter table public.academy_lab_evaluations
  drop constraint if exists academy_lab_evaluations_policy_hash_pin;

alter table public.academy_lab_evaluations
  add constraint academy_lab_evaluations_evaluator_version_pin
    check (evaluator_version = 'academy-evaluator-v1'),
  add constraint academy_lab_evaluations_policy_hash_pin
    check (
      policy_hash = 'c6dbbf7e9bcfa3506fa6aa9c3b233dd89f41aa36b6a7a5c63b7095be2668814c'
    );

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
    or p_evaluator_version <> 'academy-evaluator-v1'
    or p_policy_hash <> 'c6dbbf7e9bcfa3506fa6aa9c3b233dd89f41aa36b6a7a5c63b7095be2668814c'
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

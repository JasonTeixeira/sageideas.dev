-- Step 4B receipt-integrity boundary. A passing evaluator response may mint
-- mastery only when its release, private spec digest, runtime image, evaluator
-- version, and policy hash exactly match the latest active reviewed release.

create table if not exists public.academy_lab_activation_releases (
  release_id text primary key check (release_id ~ '^[a-z0-9][a-z0-9._-]{2,95}$'),
  registry_version text not null check (registry_version ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.academy_lab_activation_bindings (
  release_id text not null references public.academy_lab_activation_releases(release_id),
  lab_key text not null check (
    lab_key ~ '^[a-z0-9]+([-_][a-z0-9]+)*/[a-z0-9]+([-_][a-z0-9]+)*$'
  ),
  spec_revision text not null check (spec_revision ~ '^[A-Za-z0-9._-]{1,64}$'),
  spec_digest text not null check (spec_digest ~ '^[0-9a-f]{64}$'),
  runtime_image text not null check (
    runtime_image ~ '^[A-Za-z0-9][A-Za-z0-9._/:@-]*@sha256:[0-9a-f]{64}$'
  ),
  evaluator_version text not null,
  policy_hash text not null check (policy_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (release_id, lab_key),
  foreign key (lab_key, spec_revision, spec_digest)
    references public.academy_private_lab_specs(lab_key, spec_revision, spec_digest)
);

create table if not exists public.academy_lab_activation_events (
  id bigint generated always as identity primary key,
  release_id text not null references public.academy_lab_activation_releases(release_id),
  status text not null check (status in ('candidate', 'active', 'revoked')),
  attestation_digest text check (attestation_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (status = 'candidate' or attestation_digest is not null)
);

alter table public.academy_lab_activation_releases enable row level security;
alter table public.academy_lab_activation_bindings enable row level security;
alter table public.academy_lab_activation_events enable row level security;

revoke all on public.academy_lab_activation_releases from public, anon, authenticated;
revoke all on public.academy_lab_activation_bindings from public, anon, authenticated;
revoke all on public.academy_lab_activation_events from public, anon, authenticated;
grant select on public.academy_lab_activation_releases to service_role;
grant select on public.academy_lab_activation_bindings to service_role;
grant select on public.academy_lab_activation_events to service_role;

-- Release definitions and state transitions are append-only. Activation is an
-- operator-owned insert after attestation; the application service role cannot
-- activate, rewrite, or delete a release.
create or replace function public.prevent_academy_lab_activation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'academy lab activation records are append-only';
end;
$$;

drop trigger if exists academy_lab_activation_releases_append_only
  on public.academy_lab_activation_releases;
create trigger academy_lab_activation_releases_append_only
  before update or delete on public.academy_lab_activation_releases
  for each row execute function public.prevent_academy_lab_activation_mutation();

drop trigger if exists academy_lab_activation_bindings_append_only
  on public.academy_lab_activation_bindings;
create trigger academy_lab_activation_bindings_append_only
  before update or delete on public.academy_lab_activation_bindings
  for each row execute function public.prevent_academy_lab_activation_mutation();

drop trigger if exists academy_lab_activation_events_append_only
  on public.academy_lab_activation_events;
create trigger academy_lab_activation_events_append_only
  before update or delete on public.academy_lab_activation_events
  for each row execute function public.prevent_academy_lab_activation_mutation();

alter table public.academy_lab_evaluations
  add column if not exists release_id text,
  add column if not exists spec_digest text,
  add column if not exists runtime_image text;

do $$
begin
  if exists (
    select 1 from public.academy_lab_evaluations
    where release_id is null or spec_digest is null or runtime_image is null
  ) then
    raise exception 'legacy academy lab receipts require review before release binding';
  end if;
end;
$$;

alter table public.academy_lab_evaluations
  alter column release_id set not null,
  alter column spec_digest set not null,
  alter column runtime_image set not null,
  drop constraint if exists academy_lab_evaluations_submission_once,
  drop constraint if exists academy_lab_evaluations_evaluator_version_pin,
  drop constraint if exists academy_lab_evaluations_policy_hash_pin,
  add constraint academy_lab_evaluations_release_id_check
    check (release_id ~ '^[a-z0-9][a-z0-9._-]{2,95}$'),
  add constraint academy_lab_evaluations_spec_digest_check
    check (spec_digest ~ '^[0-9a-f]{64}$'),
  add constraint academy_lab_evaluations_runtime_image_check
    check (runtime_image ~ '^[A-Za-z0-9][A-Za-z0-9._/:@-]*@sha256:[0-9a-f]{64}$'),
  add constraint academy_lab_evaluations_evaluator_version_pin
    check (evaluator_version = 'academy-evaluator-v3'),
  add constraint academy_lab_evaluations_policy_hash_pin
    check (policy_hash = '049753af9b3276e7bf51b1c8269c69043f1965888c66d9328bcaa937d3bbd9ff'),
  add constraint academy_lab_evaluations_submission_once
    unique (
      user_id, release_id, lab_key, submission_digest, evaluator_version,
      policy_hash, spec_revision, spec_digest, runtime_image
    );

drop function if exists public.record_trusted_academy_lab_result(
  uuid, text, text, text, uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer
);

create function public.record_trusted_academy_lab_result(
  p_user_id uuid,
  p_release_id text,
  p_course_slug text,
  p_lesson_slug text,
  p_lab_key text,
  p_evaluation_id uuid,
  p_submission_digest text,
  p_evaluator_version text,
  p_policy_hash text,
  p_spec_revision text,
  p_spec_digest text,
  p_runtime_image text,
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
    or p_evaluator_version <> 'academy-evaluator-v3'
    or p_policy_hash <> '049753af9b3276e7bf51b1c8269c69043f1965888c66d9328bcaa937d3bbd9ff'
    or p_tests_total < 1
    or p_tests_passed <> p_tests_total
    or p_lab_key <> p_course_slug || '/' || p_lesson_slug
    or not exists (
      select 1
      from public.academy_lab_activation_bindings binding
      where binding.release_id = p_release_id
        and binding.lab_key = p_lab_key
        and binding.spec_revision = p_spec_revision
        and binding.spec_digest = p_spec_digest
        and binding.runtime_image = p_runtime_image
        and binding.evaluator_version = p_evaluator_version
        and binding.policy_hash = p_policy_hash
        and exists (
          select 1
          from public.academy_private_lab_specs private_spec
          where private_spec.lab_key = binding.lab_key
            and private_spec.spec_revision = binding.spec_revision
            and private_spec.spec_digest = binding.spec_digest
        )
    )
    or 'active' <> coalesce((
      select event.status
      from public.academy_lab_activation_events event
      where event.release_id = p_release_id
      order by event.id desc
      limit 1
    ), 'missing') then
    raise exception 'untrusted or inactive lab release rejected';
  end if;

  insert into public.academy_lab_evaluations (
    evaluation_id, user_id, release_id, course_slug, lesson_slug, lab_key,
    submission_digest, evaluator_version, policy_hash, spec_revision,
    spec_digest, runtime_image, attestation_signature, verdict, reason,
    tests_passed, tests_total, duration_ms, output_bytes
  ) values (
    p_evaluation_id, p_user_id, p_release_id, p_course_slug, p_lesson_slug, p_lab_key,
    p_submission_digest, p_evaluator_version, p_policy_hash, p_spec_revision,
    p_spec_digest, p_runtime_image, p_attestation_signature, p_verdict, p_reason,
    p_tests_passed, p_tests_total, p_duration_ms, p_output_bytes
  )
  on conflict do nothing
  returning id into v_receipt_id;

  if v_receipt_id is null then
    return exists (
      select 1 from public.academy_lab_evaluations
      where user_id = p_user_id
        and release_id = p_release_id
        and lab_key = p_lab_key
        and submission_digest = p_submission_digest
        and evaluator_version = p_evaluator_version
        and policy_hash = p_policy_hash
        and spec_revision = p_spec_revision
        and spec_digest = p_spec_digest
        and runtime_image = p_runtime_image
    );
  end if;

  insert into public.academy_evidence_events (
    user_id, course_slug, lesson_slug, unit_id, event_type, payload
  ) values
  (
    p_user_id, p_course_slug, p_lesson_slug, p_lesson_slug, 'lab_verified',
    jsonb_build_object(
      'labEvaluationId', p_evaluation_id,
      'activationReleaseId', p_release_id,
      'evaluatorVersion', p_evaluator_version,
      'policyHash', p_policy_hash,
      'specRevision', p_spec_revision,
      'specDigest', p_spec_digest,
      'runtimeImage', p_runtime_image,
      'submissionDigest', p_submission_digest,
      'trust', 'controlled_evaluator'
    )
  ),
  (
    p_user_id, p_course_slug, p_lesson_slug, p_lesson_slug, 'sprint_artifact_created',
    jsonb_build_object(
      'labEvaluationId', p_evaluation_id,
      'activationReleaseId', p_release_id,
      'trust', 'controlled_evaluator'
    )
  );

  return true;
end;
$$;

revoke execute on function public.record_trusted_academy_lab_result(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text,
  text, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.record_trusted_academy_lab_result(
  uuid, text, text, text, text, uuid, text, text, text, text, text, text,
  text, text, text, integer, integer, integer, integer
) to service_role;

-- Step 4B managed evaluator: immutable private lab packs. Hidden cases and
-- reference solutions are readable only by the server-side service role and
-- never by learner sessions, public APIs, or sandboxed submissions.

create table if not exists public.academy_private_lab_specs (
  lab_key text not null check (
    lab_key ~ '^[a-z0-9]+([-_][a-z0-9]+)*/[a-z0-9]+([-_][a-z0-9]+)*$'
  ),
  spec_revision text not null check (spec_revision ~ '^[A-Za-z0-9._-]{1,64}$'),
  spec_digest text not null check (spec_digest ~ '^[0-9a-f]{64}$'),
  spec jsonb not null check (
    jsonb_typeof(spec) = 'object'
    and spec ->> 'labKey' = lab_key
    and spec ->> 'specRevision' = spec_revision
  ),
  created_at timestamptz not null default now(),
  primary key (lab_key, spec_revision),
  unique (lab_key, spec_revision, spec_digest)
);

alter table public.academy_private_lab_specs enable row level security;

revoke all on public.academy_private_lab_specs from public, anon, authenticated;
grant select on public.academy_private_lab_specs to service_role;

-- Private packs are append-only. A changed test pack must receive a new
-- revision and pass activation again; even the service role cannot rewrite or
-- delete the evidence basis for an issued receipt.
create or replace function public.prevent_academy_private_lab_spec_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'academy_private_lab_specs is append-only';
end;
$$;

drop trigger if exists academy_private_lab_specs_append_only
  on public.academy_private_lab_specs;
create trigger academy_private_lab_specs_append_only
  before update or delete on public.academy_private_lab_specs
  for each row execute function public.prevent_academy_private_lab_spec_mutation();

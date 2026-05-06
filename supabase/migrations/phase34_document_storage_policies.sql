-- =============================================================================
-- Phase 34 — Document storage bucket + admin uploads
-- =============================================================================
-- Adds a private `documents` Storage bucket plus RLS policies so admins can
-- upload arbitrary files (PDF/DOC/images) on behalf of an organization, share
-- them with the org's portal users, and soft-delete them.
--
-- Schema additions on public.documents are additive and idempotent:
--   - mime_type, size_bytes, description, uploaded_by, deleted_at
--   - extend status check to include 'shared'
--
-- Storage policies follow existing org-scoped pattern: admin full access;
-- org members SELECT only on objects whose first path segment matches an
-- organization_id they belong to.
-- =============================================================================

-- 1. Schema additions ---------------------------------------------------------

alter table public.documents
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists description text,
  add column if not exists uploaded_by uuid references auth.users(id),
  add column if not exists deleted_at timestamptz;

-- Replace the legacy status check so 'shared' is allowed alongside the
-- existing contract lifecycle states. Drop any check constraint on the
-- `status` column by name (postgres auto-generates the name on inline checks).
do $$
declare
  cname text;
begin
  for cname in
    select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
     where c.conrelid = 'public.documents'::regclass
       and c.contype = 'c'
       and a.attname = 'status'
  loop
    execute format('alter table public.documents drop constraint %I', cname);
  end loop;
end$$;

alter table public.documents
  add constraint documents_status_check
  check (status in ('draft','shared','sent','signed','countersigned','void'));

create index if not exists idx_documents_org_status
  on public.documents(organization_id, status)
  where deleted_at is null;

create index if not exists idx_documents_engagement
  on public.documents(engagement_id)
  where deleted_at is null;

-- 2. Storage bucket -----------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 3. Storage RLS policies -----------------------------------------------------
-- Path layout: {organization_id}/{document_id}/{filename}

drop policy if exists "documents_admin_all" on storage.objects;
create policy "documents_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and public.is_admin(auth.uid()))
  with check (bucket_id = 'documents' and public.is_admin(auth.uid()));

drop policy if exists "documents_member_read" on storage.objects;
create policy "documents_member_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_admin(auth.uid())
      or public.is_org_member(((storage.foldername(name))[1])::uuid)
    )
  );

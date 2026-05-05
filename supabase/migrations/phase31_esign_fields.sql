-- Phase 31 — e-signature audit fields + public signing tokens on documents,
-- contract_templates upsert support, signed-PDF storage column.
-- All changes are additive (idempotent) — safe to re-run.

-- 1. Documents: e-signature audit trail + public signing token.
alter table public.documents
  add column if not exists template_id uuid references public.contract_templates(id) on delete set null,
  add column if not exists signature_name text,
  add column if not exists signature_ip text,
  add column if not exists signature_user_agent text,
  add column if not exists signature_timestamp timestamptz,
  add column if not exists signature_hash text,
  add column if not exists signing_token text unique,
  add column if not exists signing_token_expires timestamptz,
  add column if not exists signing_token_used boolean default false,
  add column if not exists signed_pdf_path text;

create index if not exists idx_documents_signing_token
  on public.documents(signing_token)
  where signing_token is not null;

-- 2. Contract templates: ensure name lookup is fast for upserts.
create unique index if not exists idx_contract_templates_slug_unique
  on public.contract_templates(slug);

-- 3. Helper: SHA256 fingerprint utility (search_path pinned).
create or replace function public.compute_signature_hash(
  p_name text,
  p_timestamp timestamptz,
  p_body text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return encode(
    digest(
      coalesce(p_name, '') || '|' ||
      coalesce(p_timestamp::text, '') || '|' ||
      coalesce(p_body, ''),
      'sha256'
    ),
    'hex'
  );
end;
$$;

-- Note: token-based reads for unauthenticated signers are handled in the
-- API route via the service-role client. Keeping RLS strict here avoids the
-- complexity of plumbing a custom JWT claim through PostgREST for one route.

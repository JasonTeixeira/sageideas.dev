-- =============================================================================
-- Phase 35 — Branding extensions on studio_settings + branding storage bucket
-- =============================================================================
-- Adds columns the Branding tab needs (tagline, email signature, distinct
-- primary/accent hex columns) and provisions a public `branding` bucket so
-- logos can be embedded in transactional emails without signed URLs.
-- Idempotent.
-- =============================================================================

alter table public.studio_settings
  add column if not exists tagline text,
  add column if not exists email_signature text,
  add column if not exists brand_primary_hex text,
  add column if not exists brand_accent_hex text;

-- Backfill the new hex columns from the legacy primary/secondary if unset.
update public.studio_settings
  set brand_primary_hex = coalesce(brand_primary_hex, primary_color),
      brand_accent_hex  = coalesce(brand_accent_hex, secondary_color)
  where id = 1;

-- Public branding bucket: logos are embedded in emails / served on the site.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Admin write, public read.
drop policy if exists "branding_admin_write" on storage.objects;
create policy "branding_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'branding' and public.is_admin(auth.uid()))
  with check (bucket_id = 'branding' and public.is_admin(auth.uid()));

drop policy if exists "branding_public_read" on storage.objects;
create policy "branding_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'branding');

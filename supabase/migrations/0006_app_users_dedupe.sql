-- Phase 2A.4 — Dedupe app_users rows + prevent phantom-org regressions.
--
-- Problem: getPortalContext() upserts a NEW app_users row keyed on real
-- Supabase auth UUID (clerk_id = auth.users.id). Seeded test rows live with
-- clerk_id = 'seed_<uuid>'. Both rows share the same email. Memberships +
-- engagement work attached to the seed row become invisible to the auth row,
-- and lib/portal/auth.ts then auto-creates a "Workspace" org for the "empty"
-- user.
--
-- This migration walks the duplicates, repoints FK references from the
-- seed row to the auth row, deletes the seed row, then adds a case-insensitive
-- unique constraint on email so the bug can't recur.
--
-- ============================================================================
-- IMPORTANT: This file ships as a DRY-RUN by default.
-- - The DRY-RUN block raises NOTICE rows describing every change it would make
--   without writing anything. Apply via Supabase MCP, observe the NOTICEs,
--   review, then re-run with `SET LOCAL phase2a.app_users_dedupe.apply = 'on';`
--   to perform the actual migration in a transaction.
-- ============================================================================

begin;

do $$
declare
  apply_flag text := current_setting('phase2a.app_users_dedupe.apply', true);
  apply boolean := coalesce(apply_flag, 'off') = 'on';
  rec record;
  fix_count integer := 0;
begin
  if apply then
    raise notice '[0006] APPLY MODE — writes will be committed.';
  else
    raise notice '[0006] DRY-RUN — no writes. Set phase2a.app_users_dedupe.apply=on to apply.';
  end if;

  -- Pair every seed row with the matching auth row by lower(email).
  for rec in
    select
      seed.id          as seed_id,
      seed.clerk_id    as seed_clerk_id,
      seed.email       as seed_email,
      auth.id          as auth_id,
      auth.clerk_id    as auth_clerk_id,
      auth.email       as auth_email
    from public.app_users seed
    join public.app_users auth
      on lower(seed.email) = lower(auth.email)
     and seed.id <> auth.id
     and seed.clerk_id like 'seed\_%' escape '\'
     and auth.clerk_id not like 'seed\_%' escape '\'
  loop
    fix_count := fix_count + 1;
    raise notice
      '[0006] dup #% : email=% seed_id=% -> auth_id=%',
      fix_count, rec.seed_email, rec.seed_id, rec.auth_id;

    -- Report what would move (counts) — useful in dry-run for audit.
    declare
      n_memberships integer;
      n_iterations_submitted integer;
      n_iterations_reviewed integer;
      n_files integer;
      n_documents integer;
      n_signatures integer;
      n_messages integer;
      n_activity integer;
    begin
      select count(*) into n_memberships
        from public.org_memberships where user_id = rec.seed_id;
      select count(*) into n_iterations_submitted
        from public.iterations where submitted_by = rec.seed_id;
      select count(*) into n_iterations_reviewed
        from public.iterations where reviewed_by = rec.seed_id;
      select count(*) into n_files
        from public.files where uploaded_by = rec.seed_id;
      select count(*) into n_documents
        from public.documents where created_by = rec.seed_id;
      select count(*) into n_signatures
        from public.signature_audits where signer_id = rec.seed_id;
      select count(*) into n_messages
        from public.messages where sender_id = rec.seed_id;
      select count(*) into n_activity
        from public.activity where actor_id = rec.seed_id;

      raise notice
        '       memberships=% iters_sub=% iters_rev=% files=% docs=% sigs=% msgs=% act=%',
        n_memberships, n_iterations_submitted, n_iterations_reviewed,
        n_files, n_documents, n_signatures, n_messages, n_activity;
    end;

    if apply then
      -- 1) Move org_memberships, deduping any (user_id, organization_id) collisions.
      delete from public.org_memberships m
        where m.user_id = rec.seed_id
          and exists (
            select 1 from public.org_memberships m2
              where m2.user_id = rec.auth_id
                and m2.organization_id = m.organization_id
          );
      update public.org_memberships
        set user_id = rec.auth_id
        where user_id = rec.seed_id;

      -- 2) Move iteration submissions/reviews.
      update public.iterations set submitted_by = rec.auth_id where submitted_by = rec.seed_id;
      update public.iterations set reviewed_by  = rec.auth_id where reviewed_by  = rec.seed_id;

      -- 3) Move files / documents / signatures / messages / activity.
      update public.files            set uploaded_by = rec.auth_id where uploaded_by = rec.seed_id;
      update public.documents        set created_by  = rec.auth_id where created_by  = rec.seed_id;
      update public.signature_audits set signer_id   = rec.auth_id where signer_id   = rec.seed_id;
      update public.messages         set sender_id   = rec.auth_id where sender_id   = rec.seed_id;
      update public.activity         set actor_id    = rec.auth_id where actor_id    = rec.seed_id;

      -- 4) Drop the seed row.
      delete from public.app_users where id = rec.seed_id;
    end if;
  end loop;

  raise notice '[0006] paired duplicates processed: %', fix_count;
end
$$;

-- 5) Add a case-insensitive unique index on app_users.email so future code
--    paths cannot accidentally re-introduce a duplicate. Created
--    unconditionally (idempotent via IF NOT EXISTS).
create unique index if not exists app_users_email_lower_uniq
  on public.app_users ((lower(email)));

commit;

-- Phase 2A.4 follow-up: align app_users.id to auth.users.id
--
-- The seed inserted app_users rows with random UUIDs and a 'seed_*' clerk_id.
-- When real auth.users were later created, their auth.uid() did not match the
-- seeded app_users.id. Because RLS helpers like is_org_member(org) check
-- `org_memberships.user_id = auth.uid()` directly, this caused seeded users
-- to fail their own RLS checks (they couldn't see their own org's data).
--
-- This migration:
--   1. For each app_users row whose email matches an auth.users row but whose
--      id != auth.users.id, repoint all FK references to the auth.users.id
--      and update the app_users row's id and clerk_id.
--   2. Strips the 'seed_' prefix from clerk_id where the email matches an
--      auth user (sets clerk_id = auth.users.id::text).
--
-- Idempotent: running again on already-aligned rows is a no-op.

BEGIN;

DO $$
DECLARE
  r record;
  old_id uuid;
  new_id uuid;
BEGIN
  FOR r IN
    SELECT au.id AS app_user_id, u.id AS auth_id, au.email
    FROM public.app_users au
    JOIN auth.users u ON lower(u.email) = lower(au.email)
    WHERE au.id <> u.id
  LOOP
    old_id := r.app_user_id;
    new_id := r.auth_id;

    -- Skip if a row already exists at new_id.
    IF EXISTS (SELECT 1 FROM public.app_users WHERE id = new_id) THEN
      CONTINUE;
    END IF;

    -- Insert a new app_users row at the auth.uid id, copying all columns.
    INSERT INTO public.app_users (id, clerk_id, email, full_name, avatar_url, role, created_at)
    SELECT new_id, clerk_id, email, full_name, avatar_url, role, created_at
    FROM public.app_users
    WHERE id = old_id;

    -- Repoint all FK references from old_id to new_id.
    UPDATE public.org_memberships  SET user_id     = new_id WHERE user_id     = old_id;
    UPDATE public.iterations       SET submitted_by= new_id WHERE submitted_by= old_id;
    UPDATE public.iterations       SET reviewed_by = new_id WHERE reviewed_by = old_id;
    UPDATE public.files            SET uploaded_by = new_id WHERE uploaded_by = old_id;
    UPDATE public.documents        SET created_by  = new_id WHERE created_by  = old_id;
    UPDATE public.signature_audits SET signer_id   = new_id WHERE signer_id   = old_id;
    UPDATE public.messages         SET sender_id   = new_id WHERE sender_id   = old_id;
    UPDATE public.activity         SET actor_id    = new_id WHERE actor_id    = old_id;

    -- Delete the misaligned row.
    DELETE FROM public.app_users WHERE id = old_id;
  END LOOP;
END$$;

-- Strip 'seed_' prefix from clerk_id when an auth user exists for that email.
UPDATE public.app_users au
SET clerk_id = u.id::text
FROM auth.users u
WHERE lower(u.email) = lower(au.email)
  AND au.clerk_id LIKE 'seed_%';

COMMIT;

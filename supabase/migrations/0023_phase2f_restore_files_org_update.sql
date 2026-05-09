-- Phase 2F follow-up: restore the files UPDATE policy for org members.
--
-- Migration 0022 dropped files_org_update as part of consolidating
-- permissive policies, but the consolidated combined_* policy on files
-- only covers SELECT/INSERT. The portal upload flow needs UPDATE to
-- flip is_latest=false on prior versions when a same-name file is
-- re-uploaded; without it, both the old and new rows stay is_latest=true
-- and the versioning UI shows duplicate file rows.
--
-- This restores the original 0011 policy verbatim, keyed off org membership.

DROP POLICY IF EXISTS files_org_update ON public.files;
CREATE POLICY files_org_update ON public.files FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.organization_id = files.organization_id
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = auth.uid() AND m.organization_id = files.organization_id
    )
  );

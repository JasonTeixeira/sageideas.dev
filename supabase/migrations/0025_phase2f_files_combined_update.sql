-- Phase 2F follow-up: replace files_org_update with files_combined_update
-- so admins can also edit files (matches the pattern of files_combined_select
-- and files_combined_insert: is_admin OR is_org_member).
-- Eliminates the multiple_permissive_policies WARN that arose from having
-- both files_admin_update and files_org_update target authenticated UPDATE.

DROP POLICY IF EXISTS files_org_update ON public.files;
CREATE POLICY files_combined_update ON public.files FOR UPDATE TO authenticated
  USING (
    is_admin((SELECT auth.uid()))
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = (SELECT auth.uid()) AND m.organization_id = files.organization_id
    ))
  )
  WITH CHECK (
    is_admin((SELECT auth.uid()))
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_memberships m
      WHERE m.user_id = (SELECT auth.uid()) AND m.organization_id = files.organization_id
    ))
  );

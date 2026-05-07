-- Phase 2B.8: enable org-member read access to audit_log + add organization_id index for client viewer pagination.
-- Existing al_admin_read policy is preserved (admins keep full read).

CREATE INDEX IF NOT EXISTS idx_audit_organization ON public.audit_log (organization_id, created_at DESC);

-- NOTE: An earlier draft of this policy joined org_memberships -> app_users
-- and required `app_users.id = auth.uid()`. That pattern is broken under the
-- existing app_users RLS, which hides a user's own row from itself when
-- queried via JOIN inside another policy. We use the same pattern as the
-- existing is_org_member() helper: check m.user_id = auth.uid() directly.
DROP POLICY IF EXISTS al_org_member_read ON public.audit_log;
CREATE POLICY al_org_member_read ON public.audit_log FOR SELECT TO authenticated USING (
  organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_memberships m
    WHERE m.organization_id = audit_log.organization_id
      AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY al_org_member_read ON public.audit_log IS 'Phase 2B.8 client viewer: org members can read their org audit log.';

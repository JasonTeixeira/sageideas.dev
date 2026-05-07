-- Phase 2B.8: enable org-member read access to audit_log + add organization_id index for client viewer pagination.
-- Existing al_admin_read policy is preserved (admins keep full read).

CREATE INDEX IF NOT EXISTS idx_audit_organization ON public.audit_log (organization_id, created_at DESC);

DROP POLICY IF EXISTS al_org_member_read ON public.audit_log;
CREATE POLICY al_org_member_read ON public.audit_log FOR SELECT TO authenticated USING (
  organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_memberships m
    JOIN public.app_users u ON u.id = m.user_id
    WHERE m.organization_id = audit_log.organization_id
      AND u.id = auth.uid()
  )
);

COMMENT ON POLICY al_org_member_read ON public.audit_log IS 'Phase 2B.8 client viewer: org members can read their org audit log.';

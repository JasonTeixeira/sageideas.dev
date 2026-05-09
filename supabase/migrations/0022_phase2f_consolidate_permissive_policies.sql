-- Phase 2F: Consolidate overlapping permissive RLS policies into single
-- combined policies (admin OR org-member checks merged) so the planner
-- only evaluates ONE policy per role/action.
-- Source: Supabase performance advisor (multiple_permissive_policies).
--
-- Also: harden telemetry insert policies (rls_policy_always_true WARN) and
-- revoke /rest/v1/rpc execution from the storage-quota trigger function
-- (anon_security_definer_function_executable WARN — it should never be
-- called as an RPC; it is invoked only by a trigger).

-- =========================================================================
-- bookings: merge admin_all + org_member_insert/read into single policies
-- =========================================================================
DROP POLICY IF EXISTS bookings_admin_all ON public.bookings;
DROP POLICY IF EXISTS bookings_org_member_insert ON public.bookings;
DROP POLICY IF EXISTS bookings_org_member_read ON public.bookings;

CREATE POLICY bookings_combined_select ON public.bookings
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR organization_id IS NULL
    OR EXISTS (SELECT 1 FROM org_memberships m WHERE m.organization_id = bookings.organization_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY bookings_combined_insert ON public.bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR EXISTS (SELECT 1 FROM org_memberships m WHERE m.organization_id = bookings.organization_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY bookings_admin_update ON public.bookings
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

CREATE POLICY bookings_admin_delete ON public.bookings
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- deliverable_comments
-- =========================================================================
DROP POLICY IF EXISTS dc_admin_all ON public.deliverable_comments;
DROP POLICY IF EXISTS dc_org_member_insert ON public.deliverable_comments;
DROP POLICY IF EXISTS dc_org_member_read ON public.deliverable_comments;
DROP POLICY IF EXISTS dc_self_update ON public.deliverable_comments;

CREATE POLICY dc_combined_select ON public.deliverable_comments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR EXISTS (
      SELECT 1 FROM deliverables d
      JOIN engagements e ON e.id = d.engagement_id
      JOIN org_memberships om ON om.organization_id = e.organization_id
      WHERE d.id = deliverable_comments.deliverable_id AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY dc_combined_insert ON public.deliverable_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR (
      author_id = (SELECT auth.uid()) AND EXISTS (
        SELECT 1 FROM deliverables d
        JOIN engagements e ON e.id = d.engagement_id
        JOIN org_memberships om ON om.organization_id = e.organization_id
        WHERE d.id = deliverable_comments.deliverable_id AND om.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY dc_combined_update ON public.deliverable_comments
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR author_id = (SELECT auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR author_id = (SELECT auth.uid())
  );

CREATE POLICY dc_admin_delete ON public.deliverable_comments
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- files: drop the duplicate org_* policies (combined_* policies already cover both)
-- =========================================================================
DROP POLICY IF EXISTS files_org_insert ON public.files;
DROP POLICY IF EXISTS files_org_read ON public.files;
DROP POLICY IF EXISTS files_org_update ON public.files;

-- =========================================================================
-- intake_form_definitions
-- =========================================================================
DROP POLICY IF EXISTS intake_form_def_admin_all ON public.intake_form_definitions;
DROP POLICY IF EXISTS intake_form_def_read_authed ON public.intake_form_definitions;

CREATE POLICY intake_form_def_combined_select ON public.intake_form_definitions
  FOR SELECT
  USING (true);

CREATE POLICY intake_form_def_admin_write ON public.intake_form_definitions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- project_templates
-- =========================================================================
DROP POLICY IF EXISTS project_templates_admin_all ON public.project_templates;
DROP POLICY IF EXISTS project_templates_read_authed ON public.project_templates;

CREATE POLICY project_templates_combined_select ON public.project_templates
  FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
  );

CREATE POLICY project_templates_admin_write ON public.project_templates
  FOR ALL
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- proposals
-- =========================================================================
DROP POLICY IF EXISTS proposals_admin_all ON public.proposals;
DROP POLICY IF EXISTS proposals_org_member_read ON public.proposals;

CREATE POLICY proposals_combined_select ON public.proposals
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text]))
    OR EXISTS (SELECT 1 FROM org_memberships m WHERE m.organization_id = proposals.organization_id AND m.user_id = (SELECT auth.uid()))
  );

CREATE POLICY proposals_admin_write ON public.proposals
  FOR ALL
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- studio_availability
-- =========================================================================
DROP POLICY IF EXISTS studio_avail_admin_all ON public.studio_availability;
DROP POLICY IF EXISTS studio_avail_read_authed ON public.studio_availability;

CREATE POLICY studio_avail_combined_select ON public.studio_availability
  FOR SELECT
  USING (true);

CREATE POLICY studio_avail_admin_write ON public.studio_availability
  FOR ALL
  USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- audit_log: al_admin_read + al_org_member_read overlap on SELECT
-- =========================================================================
DROP POLICY IF EXISTS al_admin_read ON public.audit_log;
DROP POLICY IF EXISTS al_org_member_read ON public.audit_log;

CREATE POLICY al_combined_read ON public.audit_log
  FOR SELECT
  USING (
    is_admin((SELECT auth.uid()))
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.organization_id = audit_log.organization_id
        AND m.user_id = (SELECT auth.uid())
    ))
  );

-- =========================================================================
-- TELEMETRY: tighten error/perf event inserts (rls_policy_always_true WARN)
-- =========================================================================
DROP POLICY IF EXISTS error_events_anyone_insert ON public.error_events;
CREATE POLICY error_events_authed_insert ON public.error_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS performance_events_anyone_insert ON public.performance_events;
CREATE POLICY performance_events_authed_insert ON public.performance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

REVOKE INSERT ON public.error_events FROM anon;
REVOKE INSERT ON public.performance_events FROM anon;

-- =========================================================================
-- enforce_org_storage_quota: revoke /rest/v1/rpc executability (trigger-only)
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.enforce_org_storage_quota() FROM PUBLIC, anon, authenticated;

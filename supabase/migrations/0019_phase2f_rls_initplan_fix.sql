-- Phase 2F: Replace inline auth.uid() with (SELECT auth.uid()) in RLS policies
-- so PostgreSQL caches the result per query (initplan) instead of evaluating
-- per row. Source: Supabase performance advisor (auth_rls_initplan).

-- =========================================================================
-- audit_log
-- =========================================================================
DROP POLICY IF EXISTS al_org_member_read ON public.audit_log;
CREATE POLICY al_org_member_read ON public.audit_log
  FOR SELECT
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.organization_id = audit_log.organization_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- =========================================================================
-- bookings
-- =========================================================================
DROP POLICY IF EXISTS bookings_admin_all ON public.bookings;
CREATE POLICY bookings_admin_all ON public.bookings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

DROP POLICY IF EXISTS bookings_org_member_insert ON public.bookings;
CREATE POLICY bookings_org_member_insert ON public.bookings
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.organization_id = bookings.organization_id
      AND m.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS bookings_org_member_read ON public.bookings;
CREATE POLICY bookings_org_member_read ON public.bookings
  FOR SELECT
  USING (
    organization_id IS NULL OR EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.organization_id = bookings.organization_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

-- =========================================================================
-- deliverable_comments
-- =========================================================================
DROP POLICY IF EXISTS dc_admin_all ON public.deliverable_comments;
CREATE POLICY dc_admin_all ON public.deliverable_comments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

DROP POLICY IF EXISTS dc_org_member_insert ON public.deliverable_comments;
CREATE POLICY dc_org_member_insert ON public.deliverable_comments
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM deliverables d
      JOIN engagements e ON e.id = d.engagement_id
      JOIN org_memberships om ON om.organization_id = e.organization_id
      WHERE d.id = deliverable_comments.deliverable_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS dc_org_member_read ON public.deliverable_comments;
CREATE POLICY dc_org_member_read ON public.deliverable_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM deliverables d
    JOIN engagements e ON e.id = d.engagement_id
    JOIN org_memberships om ON om.organization_id = e.organization_id
    WHERE d.id = deliverable_comments.deliverable_id
      AND om.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS dc_self_update ON public.deliverable_comments;
CREATE POLICY dc_self_update ON public.deliverable_comments
  FOR UPDATE
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- =========================================================================
-- files (org_* policies still use inline auth.uid())
-- =========================================================================
DROP POLICY IF EXISTS files_org_insert ON public.files;
CREATE POLICY files_org_insert ON public.files
  FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.organization_id = files.organization_id
    )
  );

DROP POLICY IF EXISTS files_org_read ON public.files;
CREATE POLICY files_org_read ON public.files
  FOR SELECT
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.organization_id = files.organization_id
    )
  );

DROP POLICY IF EXISTS files_org_update ON public.files;
CREATE POLICY files_org_update ON public.files
  FOR UPDATE
  USING (
    organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.organization_id = files.organization_id
    )
  );

-- =========================================================================
-- intake_form_definitions
-- =========================================================================
DROP POLICY IF EXISTS intake_form_def_admin_all ON public.intake_form_definitions;
CREATE POLICY intake_form_def_admin_all ON public.intake_form_definitions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

-- =========================================================================
-- message_reactions
-- =========================================================================
DROP POLICY IF EXISTS mr_org_member_read ON public.message_reactions;
CREATE POLICY mr_org_member_read ON public.message_reactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN threads t ON t.id = m.thread_id
    JOIN org_memberships om ON om.organization_id = t.organization_id
    WHERE m.id = message_reactions.message_id
      AND om.user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS mr_self_delete ON public.message_reactions;
CREATE POLICY mr_self_delete ON public.message_reactions
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS mr_self_insert ON public.message_reactions;
CREATE POLICY mr_self_insert ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN threads t ON t.id = m.thread_id
      JOIN org_memberships om ON om.organization_id = t.organization_id
      WHERE m.id = message_reactions.message_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- =========================================================================
-- project_templates
-- =========================================================================
DROP POLICY IF EXISTS project_templates_admin_all ON public.project_templates;
CREATE POLICY project_templates_admin_all ON public.project_templates
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

-- =========================================================================
-- proposals
-- =========================================================================
DROP POLICY IF EXISTS proposals_admin_all ON public.proposals;
CREATE POLICY proposals_admin_all ON public.proposals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

DROP POLICY IF EXISTS proposals_org_member_read ON public.proposals;
CREATE POLICY proposals_org_member_read ON public.proposals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM org_memberships m
    WHERE m.organization_id = proposals.organization_id
      AND m.user_id = (SELECT auth.uid())
  ));

-- =========================================================================
-- studio_availability
-- =========================================================================
DROP POLICY IF EXISTS studio_avail_admin_all ON public.studio_availability;
CREATE POLICY studio_avail_admin_all ON public.studio_availability
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = (SELECT auth.uid())
      AND au.role = ANY (ARRAY['admin'::text, 'owner'::text])
  ));

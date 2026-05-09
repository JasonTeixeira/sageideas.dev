-- Phase 2F follow-up: 0022 created admin_write policies as FOR ALL which
-- overlaps the combined_select policies for SELECT. Split admin_write into
-- specific INSERT/UPDATE/DELETE policies so SELECT is only handled by
-- combined_select.
-- Source: Supabase advisor (multiple_permissive_policies).

-- =========================================================================
-- intake_form_definitions
-- =========================================================================
DROP POLICY IF EXISTS intake_form_def_admin_write ON public.intake_form_definitions;
CREATE POLICY intake_form_def_admin_insert ON public.intake_form_definitions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY intake_form_def_admin_update ON public.intake_form_definitions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY intake_form_def_admin_delete ON public.intake_form_definitions
  FOR DELETE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- project_templates
-- =========================================================================
DROP POLICY IF EXISTS project_templates_admin_write ON public.project_templates;
CREATE POLICY project_templates_admin_insert ON public.project_templates
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY project_templates_admin_update ON public.project_templates
  FOR UPDATE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY project_templates_admin_delete ON public.project_templates
  FOR DELETE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- proposals
-- =========================================================================
DROP POLICY IF EXISTS proposals_admin_write ON public.proposals;
CREATE POLICY proposals_admin_insert ON public.proposals
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY proposals_admin_update ON public.proposals
  FOR UPDATE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY proposals_admin_delete ON public.proposals
  FOR DELETE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- studio_availability
-- =========================================================================
DROP POLICY IF EXISTS studio_avail_admin_write ON public.studio_availability;
CREATE POLICY studio_avail_admin_insert ON public.studio_availability
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY studio_avail_admin_update ON public.studio_availability
  FOR UPDATE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));
CREATE POLICY studio_avail_admin_delete ON public.studio_availability
  FOR DELETE USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = (SELECT auth.uid()) AND au.role = ANY (ARRAY['admin'::text,'owner'::text])));

-- =========================================================================
-- files: drop files_admin_update so files_org_update is the only UPDATE
-- policy. (Replaced by files_combined_update in 0025.)
-- =========================================================================
DROP POLICY IF EXISTS files_admin_update ON public.files;

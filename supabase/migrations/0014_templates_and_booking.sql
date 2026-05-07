-- 0014 Phase 2D · Project Templates + Booking (already applied to prod via Supabase MCP as `phase2d_templates_and_booking`)
CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  service_type text NOT NULL,
  description text,
  default_milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_intake_form_id uuid REFERENCES public.intake_form_definitions(id) ON DELETE SET NULL,
  default_target_days integer DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON public.project_templates(is_active) WHERE is_active = true;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_templates_read_authed ON public.project_templates;
CREATE POLICY project_templates_read_authed ON public.project_templates FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS project_templates_admin_all ON public.project_templates;
CREATE POLICY project_templates_admin_all ON public.project_templates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);
DROP TRIGGER IF EXISTS project_templates_set_updated_at ON public.project_templates;
CREATE TRIGGER project_templates_set_updated_at BEFORE UPDATE ON public.project_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.studio_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  slot_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
ALTER TABLE public.studio_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS studio_avail_read_authed ON public.studio_availability;
CREATE POLICY studio_avail_read_authed ON public.studio_availability FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS studio_avail_admin_all ON public.studio_availability;
CREATE POLICY studio_avail_admin_all ON public.studio_availability FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  booked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  meeting_kind text NOT NULL DEFAULT 'kickoff' CHECK (meeting_kind IN ('kickoff','review','status','adhoc')),
  meeting_url text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  ics_uid text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_starts ON public.bookings(starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bookings_org_member_read ON public.bookings;
CREATE POLICY bookings_org_member_read ON public.bookings FOR SELECT TO authenticated USING (
  organization_id IS NULL OR EXISTS (SELECT 1 FROM public.org_memberships m WHERE m.organization_id = bookings.organization_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS bookings_org_member_insert ON public.bookings;
CREATE POLICY bookings_org_member_insert ON public.bookings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.org_memberships m WHERE m.organization_id = bookings.organization_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS bookings_admin_all ON public.bookings;
CREATE POLICY bookings_admin_all ON public.bookings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);

INSERT INTO public.studio_availability (weekday, start_time, end_time, timezone, slot_minutes) VALUES
(1,'09:00','17:00','America/New_York',30),
(2,'09:00','17:00','America/New_York',30),
(3,'09:00','17:00','America/New_York',30),
(4,'09:00','17:00','America/New_York',30),
(5,'09:00','17:00','America/New_York',30)
ON CONFLICT DO NOTHING;

INSERT INTO public.project_templates (name, service_type, description, default_milestones, default_tasks, default_target_days) VALUES
('Web Design — 5-Page Site', 'web-design', 'Standard 5-page marketing site, 4-week build', '[{"name":"Discovery","days_offset":0},{"name":"Wireframes","days_offset":7},{"name":"Design","days_offset":14},{"name":"Build","days_offset":21},{"name":"Launch","days_offset":28}]'::jsonb, '[{"title":"Submit intake form","milestone":"Discovery"},{"title":"Approve wireframes","milestone":"Wireframes"},{"title":"Approve design comps","milestone":"Design"},{"title":"DNS handoff","milestone":"Launch"}]'::jsonb, 30),
('SEO — 90-Day Sprint', 'seo', '90-day SEO engagement covering audit, on-page, content, links', '[{"name":"Audit","days_offset":0},{"name":"On-page","days_offset":14},{"name":"Content sprint","days_offset":30},{"name":"Links + Reporting","days_offset":60}]'::jsonb, '[{"title":"Grant GA + GSC access","milestone":"Audit"},{"title":"Approve keyword map","milestone":"On-page"},{"title":"Approve content briefs","milestone":"Content sprint"}]'::jsonb, 90)
ON CONFLICT (name) DO NOTHING;

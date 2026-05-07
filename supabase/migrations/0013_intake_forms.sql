-- 0013 Phase 2D · Intake Forms (already applied to prod via Supabase MCP as `phase2d_intake_forms`)
CREATE TABLE IF NOT EXISTS public.intake_form_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL,
  title text NOT NULL,
  description text,
  schema jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_type, title)
);
CREATE INDEX IF NOT EXISTS idx_intake_form_def_service ON public.intake_form_definitions(service_type) WHERE is_active = true;
ALTER TABLE public.intake_form_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_form_def_read_authed ON public.intake_form_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY intake_form_def_admin_all ON public.intake_form_definitions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);
CREATE TRIGGER intake_form_def_set_updated_at BEFORE UPDATE ON public.intake_form_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS intake jsonb;
ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS intake_submitted_at timestamptz;
ALTER TABLE public.engagements ADD COLUMN IF NOT EXISTS intake_form_id uuid REFERENCES public.intake_form_definitions(id) ON DELETE SET NULL;

INSERT INTO public.intake_form_definitions (service_type, title, schema) VALUES
('web-design', 'Web Design Kickoff', '{"fields":[{"id":"goals","type":"textarea","label":"Project goals","required":true},{"id":"audience","type":"text","label":"Target audience","required":true},{"id":"competitors","type":"textarea","label":"Competitor sites you admire"},{"id":"brand_assets","type":"text","label":"Link to brand assets (Drive, Figma, etc.)"},{"id":"launch_date","type":"date","label":"Target launch date"}]}'::jsonb),
('seo', 'SEO Engagement Intake', '{"fields":[{"id":"current_url","type":"text","label":"Primary domain","required":true},{"id":"top_keywords","type":"textarea","label":"Top 10 target keywords"},{"id":"ga_access","type":"text","label":"Google Analytics access (email to grant)"},{"id":"gsc_access","type":"text","label":"Search Console access (email to grant)"},{"id":"main_competitors","type":"textarea","label":"3 main SEO competitors"}]}'::jsonb),
('branding', 'Brand Discovery', '{"fields":[{"id":"mission","type":"textarea","label":"Mission statement","required":true},{"id":"values","type":"textarea","label":"Core values"},{"id":"voice","type":"select","label":"Brand voice","options":["Playful","Professional","Bold","Warm","Technical"]},{"id":"inspiration","type":"textarea","label":"Brands you admire and why"}]}'::jsonb)
ON CONFLICT (service_type, title) DO NOTHING;

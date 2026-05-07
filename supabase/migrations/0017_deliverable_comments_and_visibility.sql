-- 0017 Phase 2E · Deliverable comments + per-org time-tracking visibility (already applied to prod via Supabase MCP as `phase2e_deliverable_comments_and_visibility`)
CREATE TABLE IF NOT EXISTS public.deliverable_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.deliverable_comments(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_deliverable ON public.deliverable_comments(deliverable_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_parent ON public.deliverable_comments(parent_id) WHERE parent_id IS NOT NULL;
ALTER TABLE public.deliverable_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY dc_org_member_read ON public.deliverable_comments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.deliverables d
    JOIN public.engagements e ON e.id = d.engagement_id
    JOIN public.org_memberships om ON om.organization_id = e.organization_id
    WHERE d.id = deliverable_comments.deliverable_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY dc_org_member_insert ON public.deliverable_comments FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.deliverables d
    JOIN public.engagements e ON e.id = d.engagement_id
    JOIN public.org_memberships om ON om.organization_id = e.organization_id
    WHERE d.id = deliverable_comments.deliverable_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY dc_self_update ON public.deliverable_comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY dc_admin_all ON public.deliverable_comments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);
CREATE TRIGGER dc_set_updated_at BEFORE UPDATE ON public.deliverable_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-org time-tracking visibility flag (default false)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS show_time_tracking boolean NOT NULL DEFAULT false;

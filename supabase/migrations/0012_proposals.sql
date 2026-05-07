-- 0012 Phase 2D · Proposals (already applied to prod via Supabase MCP as `phase2d_proposals`)
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  intro text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','withdrawn')),
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  acceptance_token text UNIQUE,
  acceptance_token_expires timestamptz,
  acceptance_signature_name text,
  acceptance_signature_ip text,
  acceptance_signature_ua text,
  acceptance_signature_hash text,
  resulting_engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  resulting_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes text,
  template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON public.proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON public.proposals(acceptance_token) WHERE acceptance_token IS NOT NULL;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proposals_org_member_read ON public.proposals;
CREATE POLICY proposals_org_member_read ON public.proposals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.org_memberships m WHERE m.organization_id = proposals.organization_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS proposals_admin_all ON public.proposals;
CREATE POLICY proposals_admin_all ON public.proposals FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.app_users au WHERE au.id = auth.uid() AND au.role IN ('admin','owner'))
);
DROP TRIGGER IF EXISTS proposals_set_updated_at ON public.proposals;
CREATE TRIGGER proposals_set_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

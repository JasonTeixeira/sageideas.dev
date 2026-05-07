-- 0016 Phase 2E · Message reactions (already applied to prod via Supabase MCP as `phase2e_message_reactions`)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON public.message_reactions(message_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mr_org_member_read ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.threads t ON t.id = m.thread_id
    JOIN public.org_memberships om ON om.organization_id = t.organization_id
    WHERE m.id = message_reactions.message_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY mr_self_insert ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.threads t ON t.id = m.thread_id
    JOIN public.org_memberships om ON om.organization_id = t.organization_id
    WHERE m.id = message_reactions.message_id AND om.user_id = auth.uid()
  )
);
CREATE POLICY mr_self_delete ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

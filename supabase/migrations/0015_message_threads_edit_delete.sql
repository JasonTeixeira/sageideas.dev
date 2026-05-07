-- 0015 Phase 2E · Threaded replies + edit/delete on messages (already applied to prod via Supabase MCP as `phase2e_message_threads_edit_delete`)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread_active ON public.messages(thread_id, created_at) WHERE deleted_at IS NULL;

-- Phase 2F: Add covering indexes for unindexed foreign keys.
-- Source: Supabase performance advisor (unindexed_foreign_keys).

CREATE INDEX IF NOT EXISTS idx_bookings_booked_by ON public.bookings (booked_by);
CREATE INDEX IF NOT EXISTS idx_bookings_engagement_id ON public.bookings (engagement_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_author_id ON public.deliverable_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_resolved_by ON public.deliverable_comments (resolved_by);
CREATE INDEX IF NOT EXISTS idx_engagements_intake_form_id ON public.engagements (intake_form_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_default_intake_form_id ON public.project_templates (default_intake_form_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals (created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_resulting_engagement_id ON public.proposals (resulting_engagement_id);
CREATE INDEX IF NOT EXISTS idx_proposals_resulting_invoice_id ON public.proposals (resulting_invoice_id);

-- Drop unused index flagged by advisor
DROP INDEX IF EXISTS public.sage_after_dark_members_status_idx;

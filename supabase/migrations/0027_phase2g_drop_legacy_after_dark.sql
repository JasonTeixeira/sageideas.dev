-- Phase 2G PR-3: Drop legacy `sage_after_dark_*` schema cruft.
--
-- These tables, view, and SECURITY DEFINER functions predate the current
-- codebase and have zero references in application code (verified via
-- repo-wide grep). RLS lines for these tables in
-- phase26c_advisor_hardening.sql and an index drop in
-- 0018_phase2f_perf_indexes.sql are the only mentions, and they are
-- defensive — both use `if exists`, so they remain no-ops after this
-- migration.
--
-- SYNC NOTE (PR-3b): The original PR-3 (PR #17) only dropped 4 of 8
-- tables because the agent did not have Supabase MCP access to enumerate
-- the full set of orphan objects. The remaining 4 tables, 1 view, and
-- ~37 orphan SECURITY DEFINER functions were dropped directly in prod
-- via Supabase MCP after PR #17 merged. This file is being extended
-- post-fact so that disk migrations match the current prod schema —
-- anyone rebuilding the database from migrations should land on the
-- same state as prod. All drops are idempotent (`IF EXISTS ... CASCADE`).

-- Tables (4 dropped by PR-3, 3 added here)
DROP TABLE IF EXISTS public.sage_after_dark_now_status CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_rotation_items CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_featured_posts CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_members CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_app_config CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_magic_links CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_password_resets CASCADE;

-- View
DROP VIEW IF EXISTS public.sage_after_dark_pageview_counts CASCADE;

-- Orphan SECURITY DEFINER functions (already dropped in prod via MCP)
DROP FUNCTION IF EXISTS public.sage_after_dark_add_rotation(p_kind text, p_title text, p_by text, p_year text, p_note text, p_shelf text, p_rank integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_add_rotation(p_kind text, p_title text, p_by text, p_year text, p_note text, p_shelf text, p_rank integer, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_admin_featured_all(p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_admin_magic_links(p_secret text, p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_admin_members(p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_admin_rotation_all(p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_check_admin_secret(p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_consume_magic_link(p_token text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_consume_password_reset(p_token_hash text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_create_magic_link(p_email text, p_token text, p_ttl_minutes integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_create_password_reset(p_email text, p_token_hash text, p_purpose text, p_ttl_minutes integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_deactivate_rotation(p_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_deactivate_rotation(p_id uuid, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_get_featured(p_slot text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_get_now_status() CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_get_password(p_email text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_get_rotation(p_kind text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_member_status(p_email text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_pin_post(p_slug text, p_slot text, p_rank integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_pin_post(p_slug text, p_slot text, p_rank integer, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_popular_posts(p_days integer, p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_record_login(p_email text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_register_member(p_email text, p_password_hash text, p_name text, p_referrer text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_set_password(p_email text, p_password_hash text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_stripe_event_record(p_event_id text, p_event_type text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_top_posts(p_limit integer) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_total_pageviews() CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_track_event(p_kind text, p_path text, p_slug text, p_meta jsonb, p_visitor_hash text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_track_pageview(p_path text, p_pillar text, p_template text, p_slug text, p_referrer text, p_ua_class text, p_visitor_hash text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_unpin_post(p_id uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_unpin_post(p_id uuid, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_update_profile(p_email text, p_name text, p_referrer text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_upsert_member(p_email text, p_stripe_customer_id text, p_stripe_subscription_id text, p_status text, p_plan text, p_current_period_end timestamp with time zone, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_upsert_now_status(p_status text, p_location text, p_this_week jsonb, p_not_doing jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_upsert_now_status(p_status text, p_location text, p_this_week jsonb, p_not_doing jsonb, p_secret text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_views_for_slug(p_slug text) CASCADE;
DROP FUNCTION IF EXISTS public.sage_after_dark_whoami(p_email text) CASCADE;

-- Phase 2G PR-3: Drop legacy `sage_after_dark_*` schema cruft.
--
-- These tables predate the current codebase and have zero references in
-- application code (verified via repo-wide grep). RLS lines for these
-- tables in phase26c_advisor_hardening.sql and an index drop in
-- 0018_phase2f_perf_indexes.sql are the only mentions, and they are
-- defensive — both use `if exists`, so they remain no-ops after this
-- migration.

DROP TABLE IF EXISTS public.sage_after_dark_now_status CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_rotation_items CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_featured_posts CASCADE;
DROP TABLE IF EXISTS public.sage_after_dark_members CASCADE;

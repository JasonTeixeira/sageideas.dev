-- =============================================================================
-- Phase 30b — Auto status report fields
-- =============================================================================
-- Extends project_status_updates with the columns the auto-generation API
-- writes: a markdown body, the period covered, an AI flag, and the creator.
-- The base table from Phase 26 already has summary/health/blockers/etc.; these
-- new columns coexist with those (existing manual updates untouched).
-- Idempotent.
-- =============================================================================

alter table public.project_status_updates
  add column if not exists body text;

alter table public.project_status_updates
  add column if not exists period_start timestamptz;

alter table public.project_status_updates
  add column if not exists period_end timestamptz;

alter table public.project_status_updates
  add column if not exists generated_by_ai boolean not null default false;

alter table public.project_status_updates
  add column if not exists created_by uuid references auth.users(id);

-- summary is NOT NULL in the base schema; relax it so auto reports that only
-- populate body don't fail. Existing rows untouched.
alter table public.project_status_updates
  alter column summary drop not null;

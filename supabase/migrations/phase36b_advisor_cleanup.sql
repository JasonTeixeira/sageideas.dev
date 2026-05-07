-- =============================================================================
-- Phase 36b — Follow-up cleanup after phase36_advisor_sweep
-- =============================================================================
-- Two remaining classes of advisor findings to clear:
--   1. profiles_admin_write was created as `FOR ALL` which triggers
--      multiple_permissive_policies on SELECT and UPDATE because it overlaps
--      with profiles_combined_select + profiles_self_update. Split into
--      INSERT/DELETE only so the admin-managed paths don't double-cover.
--   2. unindexed_foreign_keys (18): re-add minimal covering btree indexes on
--      foreign key columns. These are needed by the planner for cascade
--      deletes and join lookups even if not currently used heavily — they
--      were the indexes the previous unused_index linter listed, but the
--      separate unindexed_foreign_keys linter wants them back.
--      All indexes are created CONCURRENTLY-safe (we use plain CREATE INDEX
--      IF NOT EXISTS inside a migration; apply_migration runs in a transaction
--      so CONCURRENTLY is not allowed — plain CREATE INDEX is fine for these
--      small tables).
-- =============================================================================

-- 1. Re-shape profiles admin policy to remove overlap on SELECT/UPDATE
drop policy if exists "profiles_admin_write" on public.profiles;

create policy "profiles_admin_insert" on public.profiles for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "profiles_admin_delete" on public.profiles for delete to authenticated
  using (public.is_admin((select auth.uid())));
-- admin update goes through profiles_self_update for the admin's own row;
-- service_role bypasses RLS for any cross-user admin update (admin actions
-- already use service-role-key on the server).

-- 2. Restore covering indexes for foreign keys
create index if not exists activity_actor_id_idx on public.activity (actor_id);
create index if not exists deliverable_approvals_iteration_id_idx on public.deliverable_approvals (iteration_id);
create index if not exists deliverables_phase_id_idx on public.deliverables (phase_id);
create index if not exists documents_created_by_idx on public.documents (created_by);
create index if not exists files_iteration_id_idx on public.files (iteration_id);
create index if not exists files_uploaded_by_idx on public.files (uploaded_by);
create index if not exists iterations_reviewed_by_idx on public.iterations (reviewed_by);
create index if not exists iterations_submitted_by_idx on public.iterations (submitted_by);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists profiles_approved_by_idx on public.profiles (approved_by);
create index if not exists signature_audits_signer_id_idx on public.signature_audits (signer_id);
create index if not exists studio_settings_updated_by_idx on public.studio_settings (updated_by);
create index if not exists task_attachments_file_id_idx on public.task_attachments (file_id);
create index if not exists task_attachments_task_id_idx on public.task_attachments (task_id);
create index if not exists task_comments_task_id_idx on public.task_comments (task_id);
create index if not exists tasks_parent_task_id_idx on public.tasks (parent_task_id);
create index if not exists tasks_phase_id_idx on public.tasks (phase_id);
create index if not exists time_entries_task_id_idx on public.time_entries (task_id);

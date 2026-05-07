-- =============================================================================
-- Phase 36 — Supabase advisor sweep (Phase 1 of game plan)
-- =============================================================================
-- Goal: zero unaddressed Sage Ideas advisor findings.
--
-- This migration is idempotent and reversible. It performs five operations:
--
--   1. Add minimal RLS policies to the three RLS-enabled-no-policy tables
--      (analytics_event, analytics_pageview, engagement_inquiries).
--   2. Rewrite every flagged auth_rls_initplan policy: replace
--      `auth.uid()` and `public.is_admin(auth.uid())` with `(select ...)`
--      forms so they are evaluated once per query instead of once per row.
--   3. Consolidate multiple_permissive_policies: collapse `*_admin_all` (SELECT
--      path) and the corresponding `*_members_read` policy into a single
--      combined SELECT policy. The admin policy is then restricted to
--      INSERT/UPDATE/DELETE only via separate `*_admin_write` policies.
--   4. Drop the 35 confirmed unused indexes (indexes can be re-added later
--      via Phase 5 perf work if usage emerges).
--   5. Lock down public-callable SECURITY DEFINER functions so anonymous
--      callers cannot execute admin/membership helpers.
--
-- Safety: every CREATE POLICY is preceded by DROP POLICY IF EXISTS.
-- service_role bypasses RLS by default, so server-side actions are unaffected.
-- =============================================================================

-- (Wrapped in transaction by apply_migration; no explicit BEGIN/COMMIT here.)

-- -----------------------------------------------------------------------------
-- 1. RLS policies for analytics + engagement_inquiries
--    Pattern: deny anon (false), allow admin select, allow service_role insert
-- -----------------------------------------------------------------------------

-- ANALYTICS_EVENT (server writes, admin reads, no client access)
drop policy if exists "ae_admin_read" on public.analytics_event;
create policy "ae_admin_read" on public.analytics_event for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "ae_no_anon" on public.analytics_event;
create policy "ae_no_anon" on public.analytics_event for all to anon
  using (false) with check (false);

-- ANALYTICS_PAGEVIEW (same shape)
drop policy if exists "ap_admin_read" on public.analytics_pageview;
create policy "ap_admin_read" on public.analytics_pageview for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "ap_no_anon" on public.analytics_pageview;
create policy "ap_no_anon" on public.analytics_pageview for all to anon
  using (false) with check (false);

-- ENGAGEMENT_INQUIRIES (anon submits via /contact API using service role;
-- no direct anon writes; admin reads).
drop policy if exists "ei_admin_read" on public.engagement_inquiries;
create policy "ei_admin_read" on public.engagement_inquiries for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "ei_no_anon" on public.engagement_inquiries;
create policy "ei_no_anon" on public.engagement_inquiries for all to anon
  using (false) with check (false);

-- -----------------------------------------------------------------------------
-- 2 + 3. Rewrite + consolidate every flagged policy
-- -----------------------------------------------------------------------------
-- Pattern A (table has *_admin_all + *_members_read): drop both, create
--   *_combined_select (admin OR member) and *_admin_write (insert/update/delete).
-- Pattern B (table has only *_admin_all): drop, recreate using (select ...).
-- Pattern C (self + admin): drop, recreate with (select auth.uid()).
-- -----------------------------------------------------------------------------

-- PROFILES
drop policy if exists "admins all access" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;

create policy "profiles_combined_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin((select auth.uid())));

create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "profiles_admin_write" on public.profiles for all to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- ORGANIZATIONS
drop policy if exists "orgs_admin_all" on public.organizations;
drop policy if exists "orgs_members_read" on public.organizations;

create policy "orgs_combined_select" on public.organizations for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(id));

create policy "orgs_admin_write" on public.organizations for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "orgs_admin_update" on public.organizations for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "orgs_admin_delete" on public.organizations for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- ORG_MEMBERSHIPS
drop policy if exists "om_admin_all" on public.org_memberships;
drop policy if exists "om_self_read" on public.org_memberships;

create policy "om_combined_select" on public.org_memberships for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or user_id = (select auth.uid())
    or public.is_org_member(organization_id)
  );

create policy "om_admin_write" on public.org_memberships for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "om_admin_update" on public.org_memberships for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "om_admin_delete" on public.org_memberships for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- ENGAGEMENTS
drop policy if exists "eng_admin_all" on public.engagements;
drop policy if exists "eng_members_read" on public.engagements;

create policy "eng_combined_select" on public.engagements for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "eng_admin_write" on public.engagements for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "eng_admin_update" on public.engagements for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "eng_admin_delete" on public.engagements for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- PHASES
drop policy if exists "phases_admin_all" on public.phases;
drop policy if exists "phases_members_read" on public.phases;

create policy "phases_combined_select" on public.phases for select to authenticated
  using (public.is_admin((select auth.uid())) or public.can_access_engagement(engagement_id));

create policy "phases_admin_write" on public.phases for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "phases_admin_update" on public.phases for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "phases_admin_delete" on public.phases for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- DELIVERABLES
drop policy if exists "deliv_admin_all" on public.deliverables;
drop policy if exists "deliv_members_rw" on public.deliverables;

create policy "deliv_combined_select" on public.deliverables for select to authenticated
  using (public.is_admin((select auth.uid())) or public.can_access_engagement(engagement_id));

create policy "deliv_admin_write" on public.deliverables for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "deliv_admin_update" on public.deliverables for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "deliv_admin_delete" on public.deliverables for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- ITERATIONS
drop policy if exists "iter_admin_all" on public.iterations;
drop policy if exists "iter_members_read" on public.iterations;

create policy "iter_combined_select" on public.iterations for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.deliverables d
      where d.id = iterations.deliverable_id
        and public.can_access_engagement(d.engagement_id)
    )
  );

create policy "iter_admin_write" on public.iterations for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "iter_admin_update" on public.iterations for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "iter_admin_delete" on public.iterations for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- INVOICES
drop policy if exists "inv_admin_all" on public.invoices;
drop policy if exists "inv_members_read" on public.invoices;

create policy "inv_combined_select" on public.invoices for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "inv_admin_write" on public.invoices for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "inv_admin_update" on public.invoices for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "inv_admin_delete" on public.invoices for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- INVOICE_LINE_ITEMS
drop policy if exists "ili_admin_all" on public.invoice_line_items;
drop policy if exists "ili_members_read" on public.invoice_line_items;

create policy "ili_combined_select" on public.invoice_line_items for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.invoices i
      where i.id = invoice_line_items.invoice_id
        and public.is_org_member(i.organization_id)
    )
  );

create policy "ili_admin_write" on public.invoice_line_items for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "ili_admin_update" on public.invoice_line_items for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "ili_admin_delete" on public.invoice_line_items for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- PAYMENTS
drop policy if exists "pay_admin_all" on public.payments;
drop policy if exists "pay_members_read" on public.payments;

create policy "pay_combined_select" on public.payments for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "pay_admin_write" on public.payments for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "pay_admin_update" on public.payments for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "pay_admin_delete" on public.payments for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- THREADS
drop policy if exists "thr_admin_all" on public.threads;
drop policy if exists "thr_members_rw" on public.threads;
drop policy if exists "thr_members_insert" on public.threads;

create policy "thr_combined_select" on public.threads for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "thr_combined_insert" on public.threads for insert to authenticated
  with check (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "thr_admin_update" on public.threads for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "thr_admin_delete" on public.threads for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- MESSAGES
drop policy if exists "msg_admin_all" on public.messages;
drop policy if exists "msg_thread_members_read" on public.messages;
drop policy if exists "msg_thread_members_insert" on public.messages;

create policy "msg_combined_select" on public.messages for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and public.is_org_member(t.organization_id)
    )
  );

create policy "msg_combined_insert" on public.messages for insert to authenticated
  with check (
    public.is_admin((select auth.uid()))
    or (
      sender_id = (select auth.uid())
      and exists (
        select 1 from public.threads t
        where t.id = messages.thread_id and public.is_org_member(t.organization_id)
      )
    )
  );

create policy "msg_admin_update" on public.messages for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "msg_admin_delete" on public.messages for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- MESSAGE_READ_RECEIPTS
drop policy if exists "mrr_self_all" on public.message_read_receipts;
drop policy if exists "mrr_admin_read" on public.message_read_receipts;

create policy "mrr_combined_select" on public.message_read_receipts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

create policy "mrr_self_write" on public.message_read_receipts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "mrr_self_update" on public.message_read_receipts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mrr_self_delete" on public.message_read_receipts for delete to authenticated
  using (user_id = (select auth.uid()));

-- ACTIVITY
drop policy if exists "act_admin_all" on public.activity;
drop policy if exists "act_members_read" on public.activity;

create policy "act_combined_select" on public.activity for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "act_admin_write" on public.activity for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "act_admin_update" on public.activity for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "act_admin_delete" on public.activity for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- FILES
drop policy if exists "files_admin_all" on public.files;
drop policy if exists "files_members_rw" on public.files;
drop policy if exists "files_members_insert" on public.files;

create policy "files_combined_select" on public.files for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "files_combined_insert" on public.files for insert to authenticated
  with check (
    public.is_admin((select auth.uid()))
    or (uploaded_by = (select auth.uid()) and public.is_org_member(organization_id))
  );

create policy "files_admin_update" on public.files for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "files_admin_delete" on public.files for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- FILE_VERSIONS
drop policy if exists "fv_admin_all" on public.file_versions;
drop policy if exists "fv_members_read" on public.file_versions;

create policy "fv_combined_select" on public.file_versions for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.files f
      where f.id = file_versions.file_id and public.is_org_member(f.organization_id)
    )
  );

create policy "fv_admin_write" on public.file_versions for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "fv_admin_update" on public.file_versions for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "fv_admin_delete" on public.file_versions for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- DOCUMENTS
drop policy if exists "docs_admin_all" on public.documents;
drop policy if exists "docs_members_read" on public.documents;

create policy "docs_combined_select" on public.documents for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "docs_admin_write" on public.documents for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "docs_admin_update" on public.documents for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "docs_admin_delete" on public.documents for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- SIGNATURE_AUDITS
drop policy if exists "sig_admin_all" on public.signature_audits;
drop policy if exists "sig_self_read" on public.signature_audits;

create policy "sig_combined_select" on public.signature_audits for select to authenticated
  using (signer_id = (select auth.uid()) or public.is_admin((select auth.uid())));

create policy "sig_admin_write" on public.signature_audits for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "sig_admin_update" on public.signature_audits for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "sig_admin_delete" on public.signature_audits for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- SERVICE_CATALOG (public read on active rows; admin write)
drop policy if exists "svc_admin_all" on public.service_catalog;
drop policy if exists "svc_public_read" on public.service_catalog;

create policy "svc_combined_select" on public.service_catalog for select to anon, authenticated
  using (active = true or public.is_admin((select auth.uid())));

create policy "svc_admin_write" on public.service_catalog for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "svc_admin_update" on public.service_catalog for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "svc_admin_delete" on public.service_catalog for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- APP_USERS
drop policy if exists "appu_admin_all" on public.app_users;

create policy "appu_admin_select" on public.app_users for select to authenticated
  using (public.is_admin((select auth.uid())));
create policy "appu_admin_write" on public.app_users for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "appu_admin_update" on public.app_users for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "appu_admin_delete" on public.app_users for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- NEWSLETTER_SUBSCRIBERS
drop policy if exists "ns_admin_all" on public.newsletter_subscribers;

create policy "ns_admin_select" on public.newsletter_subscribers for select to authenticated
  using (public.is_admin((select auth.uid())));
create policy "ns_admin_write" on public.newsletter_subscribers for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "ns_admin_update" on public.newsletter_subscribers for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "ns_admin_delete" on public.newsletter_subscribers for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- TASKS
drop policy if exists "tasks_admin_all" on public.tasks;
drop policy if exists "tasks_members_rw" on public.tasks;
drop policy if exists "tasks_members_insert" on public.tasks;
drop policy if exists "tasks_assignee_update" on public.tasks;

create policy "tasks_combined_select" on public.tasks for select to authenticated
  using (public.is_admin((select auth.uid())) or public.can_access_engagement(engagement_id));

create policy "tasks_combined_insert" on public.tasks for insert to authenticated
  with check (public.is_admin((select auth.uid())) or public.can_access_engagement(engagement_id));

create policy "tasks_combined_update" on public.tasks for update to authenticated
  using (
    public.is_admin((select auth.uid()))
    or assignee_id = (select auth.uid())
    or reporter_id = (select auth.uid())
  )
  with check (
    public.is_admin((select auth.uid()))
    or assignee_id = (select auth.uid())
    or reporter_id = (select auth.uid())
  );

create policy "tasks_admin_delete" on public.tasks for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- TASK_COMMENTS
drop policy if exists "tc_admin_all" on public.task_comments;
drop policy if exists "tc_members_rw" on public.task_comments;
drop policy if exists "tc_members_insert" on public.task_comments;

create policy "tc_combined_select" on public.task_comments for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and public.can_access_engagement(t.engagement_id)
    )
  );

create policy "tc_combined_insert" on public.task_comments for insert to authenticated
  with check (
    public.is_admin((select auth.uid()))
    or (
      author_id = (select auth.uid())
      and exists (
        select 1 from public.tasks t
        where t.id = task_comments.task_id and public.can_access_engagement(t.engagement_id)
      )
    )
  );

create policy "tc_admin_update" on public.task_comments for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "tc_admin_delete" on public.task_comments for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- TASK_ATTACHMENTS
drop policy if exists "ta_admin_all" on public.task_attachments;
drop policy if exists "ta_members_read" on public.task_attachments;

create policy "ta_combined_select" on public.task_attachments for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id and public.can_access_engagement(t.engagement_id)
    )
  );

create policy "ta_admin_write" on public.task_attachments for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "ta_admin_update" on public.task_attachments for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "ta_admin_delete" on public.task_attachments for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- PROJECT_MILESTONES
drop policy if exists "pm_admin_all" on public.project_milestones;
drop policy if exists "pm_members_read" on public.project_milestones;

create policy "pm_combined_select" on public.project_milestones for select to authenticated
  using (public.is_admin((select auth.uid())) or public.can_access_engagement(engagement_id));

create policy "pm_admin_write" on public.project_milestones for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "pm_admin_update" on public.project_milestones for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "pm_admin_delete" on public.project_milestones for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- PROJECT_STATUS_UPDATES
drop policy if exists "psu_admin_all" on public.project_status_updates;
drop policy if exists "psu_members_read" on public.project_status_updates;

create policy "psu_combined_select" on public.project_status_updates for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or (visible_to_client = true and public.can_access_engagement(engagement_id))
  );

create policy "psu_admin_write" on public.project_status_updates for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "psu_admin_update" on public.project_status_updates for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "psu_admin_delete" on public.project_status_updates for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- DELIVERABLE_APPROVALS
drop policy if exists "da_admin_all" on public.deliverable_approvals;
drop policy if exists "da_members_read" on public.deliverable_approvals;

create policy "da_combined_select" on public.deliverable_approvals for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or exists (
      select 1 from public.deliverables d
      where d.id = deliverable_approvals.deliverable_id
        and public.can_access_engagement(d.engagement_id)
    )
  );

create policy "da_admin_write" on public.deliverable_approvals for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "da_admin_update" on public.deliverable_approvals for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "da_admin_delete" on public.deliverable_approvals for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- CONTRACT_TEMPLATES
drop policy if exists "ct_admin_all" on public.contract_templates;

create policy "ct_admin_select" on public.contract_templates for select to authenticated
  using (public.is_admin((select auth.uid())));
create policy "ct_admin_write" on public.contract_templates for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "ct_admin_update" on public.contract_templates for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "ct_admin_delete" on public.contract_templates for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- CALENDAR_EVENTS
drop policy if exists "cal_admin_all" on public.calendar_events;
drop policy if exists "cal_members_read" on public.calendar_events;

create policy "cal_combined_select" on public.calendar_events for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or (
      visible_to_client = true
      and (
        public.is_org_member(organization_id)
        or public.can_access_engagement(engagement_id)
      )
    )
  );

create policy "cal_admin_write" on public.calendar_events for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "cal_admin_update" on public.calendar_events for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "cal_admin_delete" on public.calendar_events for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- MEETING_NOTES
drop policy if exists "mn_admin_all" on public.meeting_notes;
drop policy if exists "mn_members_read" on public.meeting_notes;

create policy "mn_combined_select" on public.meeting_notes for select to authenticated
  using (
    public.is_admin((select auth.uid()))
    or (visible_to_client = true and public.can_access_engagement(engagement_id))
  );

create policy "mn_admin_write" on public.meeting_notes for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "mn_admin_update" on public.meeting_notes for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "mn_admin_delete" on public.meeting_notes for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- TIME_ENTRIES (admin OR self for everything)
drop policy if exists "te_admin_all" on public.time_entries;
drop policy if exists "te_self_all" on public.time_entries;

create policy "te_combined_select" on public.time_entries for select to authenticated
  using (public.is_admin((select auth.uid())) or user_id = (select auth.uid()));

create policy "te_combined_insert" on public.time_entries for insert to authenticated
  with check (public.is_admin((select auth.uid())) or user_id = (select auth.uid()));

create policy "te_combined_update" on public.time_entries for update to authenticated
  using (public.is_admin((select auth.uid())) or user_id = (select auth.uid()))
  with check (public.is_admin((select auth.uid())) or user_id = (select auth.uid()));

create policy "te_combined_delete" on public.time_entries for delete to authenticated
  using (public.is_admin((select auth.uid())) or user_id = (select auth.uid()));

-- NOTIFICATIONS
drop policy if exists "notif_self_all" on public.notifications;
drop policy if exists "notif_admin_read" on public.notifications;

create policy "notif_combined_select" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

create policy "notif_self_insert" on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));
create policy "notif_self_update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notif_self_delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- NOTIFICATION_PREFERENCES
drop policy if exists "np_self_all" on public.notification_preferences;

create policy "np_self_select" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "np_self_insert" on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "np_self_update" on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "np_self_delete" on public.notification_preferences for delete to authenticated
  using (user_id = (select auth.uid()));

-- AUDIT_LOG
drop policy if exists "al_admin_read" on public.audit_log;
create policy "al_admin_read" on public.audit_log for select to authenticated
  using (public.is_admin((select auth.uid())));

-- STUDIO_SETTINGS
drop policy if exists "studio_settings_admin_select" on public.studio_settings;
drop policy if exists "studio_settings_admin_update" on public.studio_settings;

create policy "studio_settings_admin_select" on public.studio_settings for select to authenticated
  using (public.is_admin((select auth.uid())));
create policy "studio_settings_admin_update" on public.studio_settings for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));

-- EMAIL_LOG
drop policy if exists "email_log_admin_read" on public.email_log;
create policy "email_log_admin_read" on public.email_log for select to authenticated
  using (public.is_admin((select auth.uid())));

-- STRIPE_SUBSCRIPTIONS
drop policy if exists "stripe_subs_admin_all" on public.stripe_subscriptions;
drop policy if exists "stripe_subs_members_read" on public.stripe_subscriptions;

create policy "stripe_subs_combined_select" on public.stripe_subscriptions for select to authenticated
  using (public.is_admin((select auth.uid())) or public.is_org_member(organization_id));

create policy "stripe_subs_admin_write" on public.stripe_subscriptions for insert to authenticated
  with check (public.is_admin((select auth.uid())));
create policy "stripe_subs_admin_update" on public.stripe_subscriptions for update to authenticated
  using (public.is_admin((select auth.uid()))) with check (public.is_admin((select auth.uid())));
create policy "stripe_subs_admin_delete" on public.stripe_subscriptions for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- STRIPE_EVENT_LOG
drop policy if exists "stripe_event_log_admin_read" on public.stripe_event_log;
create policy "stripe_event_log_admin_read" on public.stripe_event_log for select to authenticated
  using (public.is_admin((select auth.uid())));

-- -----------------------------------------------------------------------------
-- 4. Drop confirmed unused indexes (35)
--    Reversible: each can be re-added via Phase 5 perf work if needed.
-- -----------------------------------------------------------------------------
drop index if exists public.analytics_event_slug_idx;
drop index if exists public.analytics_event_kind_idx;
drop index if exists public.analytics_event_created_at_idx;
drop index if exists public.analytics_pageview_path_idx;
drop index if exists public.analytics_pageview_created_at_idx;
drop index if exists public.app_users_clerk_id_idx;
drop index if exists public.engagement_inquiries_status_idx;
drop index if exists public.engagement_inquiries_type_idx;
drop index if exists public.subscribers_status_idx;
drop index if exists public.idx_task_comments_task;
drop index if exists public.idx_task_attachments_task;
drop index if exists public.newsletter_subscribers_status_idx;
drop index if exists public.idx_audit_entity;
drop index if exists public.idx_email_log_provider_msg;
drop index if exists public.idx_email_log_status_sent;
drop index if exists public.idx_email_log_recipient;
drop index if exists public.idx_invoices_stripe_session;
drop index if exists public.idx_invoices_dunning_status;
drop index if exists public.idx_stripe_event_log_event_type;
drop index if exists public.activity_actor_id_idx;
drop index if exists public.deliverable_approvals_iteration_id_idx;
drop index if exists public.deliverables_phase_id_idx;
drop index if exists public.documents_created_by_idx;
drop index if exists public.files_iteration_id_idx;
drop index if exists public.files_uploaded_by_idx;
drop index if exists public.iterations_reviewed_by_idx;
drop index if exists public.iterations_submitted_by_idx;
drop index if exists public.messages_sender_id_idx;
drop index if exists public.profiles_approved_by_idx;
drop index if exists public.signature_audits_signer_id_idx;
drop index if exists public.studio_settings_updated_by_idx;
drop index if exists public.task_attachments_file_id_idx;
drop index if exists public.tasks_parent_task_id_idx;
drop index if exists public.tasks_phase_id_idx;
drop index if exists public.time_entries_task_id_idx;

-- -----------------------------------------------------------------------------
-- 5. Lock down public-callable SECURITY DEFINER helpers
--    The Sage Ideas helpers (is_admin, is_org_member, can_access_engagement)
--    were already revoked from anon in phase26c. Re-assert here for idempotency
--    and add the public.subscribe function (newsletter signup) which still
--    needs to be callable by anon — switch it to SECURITY INVOKER instead.
-- -----------------------------------------------------------------------------

do $plpgsql$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'subscribe'
  ) then
    -- public.subscribe is the newsletter signup; switch from SECURITY DEFINER
    -- to SECURITY INVOKER so it executes with the caller's permissions, then
    -- ensure the underlying table policy permits anon insert via service_role
    -- only (newsletter_subscribers is admin-only above; signup goes through
    -- /api/newsletter/subscribe with the service-role key, not direct RPC).
    execute 'alter function public.subscribe(text, text) security invoker';
  end if;
end
$plpgsql$;

-- Reassert phase26c revokes (idempotent)
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.can_access_engagement(uuid) from public, anon;
revoke execute on function public.current_role_app() from public, anon;

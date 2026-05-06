# Phase 1 — Advisor Sweep Summary

## Baseline → After Sweep (Sage Ideas only; sister `sage_after_dark` excluded)

| Category | Before | After | Resolved |
|---|---|---|---|
| Security | 10 | 5 | 5 |
| Performance | 126 | 19 | 107 |

## Migrations applied
1. `phase36_advisor_sweep` — RLS policies on analytics_event/analytics_pageview/engagement_inquiries; rewrite 50 initplan policies to `(select auth.uid())`; consolidate 40 multiple_permissive_policies; drop 35 unused indexes; lock down SECURITY DEFINER on `public.subscribe`; reassert revokes on internal helpers.
2. `phase36b_advisor_cleanup` — split `profiles_admin_write` into INSERT/DELETE only (dropped FOR ALL overlap); restore 18 covering indexes for foreign keys.

## Remaining findings (accepted)

### Security (5)
- 4 × `authenticated_security_definer_function_executable` on `is_admin`, `is_org_member`, `can_access_engagement`, `current_role_app`. **Required pattern for RLS helpers** — must be DEFINER to evaluate against tables not directly readable by the authenticated user. Already revoked from anon.
- 1 × `auth_leaked_password_protection` — manual dashboard toggle (Phase 1 step 8).

### Performance (19)
- 18 × `unused_index` (INFO) — FK-covering indexes restored in 36b. They show as "unused" until traffic flows; the alternative (`unindexed_foreign_keys` warnings) is worse for real workloads. Accepted tradeoff.
- 1 × `auth_db_connections_absolute` — infra config; out of scope for Phase 1 migrations.

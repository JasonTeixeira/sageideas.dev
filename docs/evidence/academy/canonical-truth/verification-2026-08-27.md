# Academy Canonical Truth Verification

**Date:** 2026-08-27
**Branch:** `academy/01-canonical-truth`
**Registry:** `sha256:874c2f483948e9d0dbead455ca7fd31502895630ad0244733b3cf51add4a6cc3`

## Passing scoped gates

- `npm run academy:registry:verify` — passed eight registry contract tests, one application-adapter test, and deterministic drift verification.
- `npm run typecheck` — passed using the repository's existing dependency installation.
- Targeted ESLint over all Step 1 application, authoring, audit, registry, and test files — passed with zero warnings/errors.
- `npx tsx scripts/academy/authoring/apply-course.ts --self-test` — passed fail-closed block validation.
- `npx tsx scripts/academy/authoring/apply-course.ts git-the-terminal` — dry-run passed 20/20 lessons and performed no database writes. This course was absent from the legacy manifest.
- `npx tsx scripts/academy/ingest-career-os.ts` — dry-run validated 21 source courses / 426 source lessons against registered identities and performed no database writes.
- Local `/academy/catalog` request — HTTP 200 and honest database-unavailable fallback of 2 public fallback courses / 34 authored lessons.
- `git diff --check` — passed.

## External and repository-wide blockers

- Read-only Supabase reconciliation returned `TypeError: fetch failed`; runtime publication truth remains unverified. See `runtime-reconciliation-2026-08-27.md`.
- The monolithic `npm run test:unit` has 16 pre-existing non-Academy failures concentrated in Sprout/Discord operating-system fixtures and missing untracked Discord modules. The Academy auth-aware catalog assertion passes after this slice.
- The production webpack build is blocked by pre-existing CSS-module purity errors in `app/academy/legal/legal.module.css` and `app/learn/waitlist/waitlist.module.css`.
- `package.json` and `package-lock.json` are already out of sync. An unlocked install pulls a newer Stripe type and exposes an unrelated API-date mismatch in `lib/stripe/client.ts`.
- `npm audit --omit=dev --audit-level=high` reports 12 existing vulnerabilities: 10 high and 2 moderate. Dependency remediation is required before production launch and was not mixed into this registry slice.

## Security review

- Canonical course, alias, and lesson identities are restricted to safe lowercase route segments.
- Capability evidence paths must remain inside the repository.
- Registry generation strips external absolute source paths and emits no credentials.
- Unknown runtime/database identities fail closed in application and authoring adapters.
- Runtime reconciliation is read-only.
- Existing client/output-substring lab evidence is marked untrusted and cannot pass the current quality harness.
- No Supabase, Stripe, deployment, credential, or third-party mutation occurred.

# Studio cleanup — November 8, 2026

## Diagnosis

The screenshots show two existing applications, not evidence of two deployed
versions of `/admin`:

- `/admin`: owner operations cockpit (first screenshot).
- `/portal`: client engagement workspace (second screenshot). Its admin shortcuts
  make it resemble a second owner dashboard.

`/auth/redirect` already sends profile-role admins to `/admin`. Direct `/portal`
links can still put the owner into the client dashboard. The cleanup redirects
admins opening `/portal` to `/admin`, while preserving an explicit `?org=slug`
client organization view or `?view=client` portal switch and all client detail routes. Clients retain their
workspace. No role, password, session, MFA, or authorization policy is weakened.

## Misleading email diagnosis

`tests/e2e/portal/proposal-accept.spec.ts` creates `Phase 2D test proposal <stamp>`
for USD 2,500 and accepts it as `Phase 2D Tester`. The acceptance handler calls
the normal admin notification sender. `tests/e2e/admin/acquisition.spec.ts` creates
Avery Stone / `E2E Inbound <stamp>` / `program-7-e2e` and the exact inquiry text
reported by the owner. The inquiry handler sends normal studio notifications.

The reported stamps decode to November 7, 2026, 7:40:01 PM and 7:41:07 PM
America/New_York. This matches the reported email arrival. This establishes the
fixture match; the investigation has not attributed who or which runner executed
that run, inspected the live database, or verified email headers.

The E2E configuration previously defaulted to `https://www.sageideas.dev`.
Some specs have host-based skips, but proposal seeding runs before the test-body
skip. A preview/local server can also share production database/email credentials.
The new config defaults to localhost and refuses production Sage Ideas domains.
This is one guardrail, not complete isolation of all scripts or database targets.

Before running any integration/E2E test, use a separate staging Supabase project
and email sandbox. Do not load production database or email credentials into a
local or preview test server. No live E2E test was run for this cleanup.

## Live records: review before removal

Pending approval means an account signup, not a sales inquiry or booked job.

- `pending+test@sageideas.org`: exact test seed match.
- `preview.learner@sageideas.dev`: exact automated script account match.
- `demo@sageideas.dev`, `academy-harness@sageideas.dev`,
  `demo-client@sageideas.dev`: probable fixtures based on screenshot names;
  exact provenance not established here.
- Jason / Nexural and Neeraj Dhulipala: unverified. Preserve.

Before a separate data cleanup, inventory exact record UUIDs and dependencies
using authorized read-only access. Present a proposed archive/delete list and
obtain scoped owner approval. Preserve financial/audit dependencies and unrelated
records. No account has been approved, rejected, archived, or deleted here.

## Release boundary

Changes are local on branch `fix/studio-admin-entry-20261108` in
`/Users/Sage/code/worktrees/studio-admin-entry-20261108`. No push or deployment is
authorized by this document. Obtain owner approval for publication after local
verification and review. The live site retains its current behavior until deployed.

## Local verification commands

- `node --test tests/unit/studio-entry.test.mjs` executes the actual dashboard and
  Playwright config through TypeScript transpilation with mocked dependencies.
  It checks owner routing, client preservation, explicit organization selection, repeated query parameters, intentional client view,
  local default, production-host refusal, and local/staging configuration.
- `npm run test:unit` runs the existing repository suite.
- `npx eslint app/portal/page.tsx playwright.e2e.config.ts tests/unit/studio-entry.test.mjs`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

Dependency setup initially fails under `npm ci` because the existing manifest
and lockfile disagree. Ordinary installation also encounters an existing
OpenTelemetry peer conflict. A local-only install using `--legacy-peer-deps
--package-lock=false --ignore-scripts` provides verification tooling without
changing dependency manifests. Release dependency reproducibility remains a
separate existing issue; do not silently update dependencies as part of routing.


## Verification results

- Initial regression run: 6 tests executed; 4 reproduced the routing/config bugs.
- First fix: all 6 passed; commit gate typecheck and staged-secret scan passed.
- Review found repeated org query values and the existing portal switch needed
  preservation. Added two regression tests (8 total, 2 failed before correction).
- Scoped ESLint: passed before review follow-up; final result recorded in receipt.
- Existing unit suite: 306 passed, 24 failed. Failures include missing tracked
  Discord/Sprout modules, source-contract assertions, and OpenTelemetry imports.
- Production build: failed resolving `@opentelemetry/exporter-trace-otlp-http`
  and `@opentelemetry/otlp-exporter-base`. No production environment was loaded.
- Do not claim full release readiness or deploy on the basis of this local patch.

The repository reviewer role could not start with its configured model in this
account; a read-only review using the inherited available model found the two
issues above. This did not access live data or external systems.


Final focused verification: 8/8 regression tests passed; scoped ESLint passed;
commit-time TypeScript and staged-secret checks passed; diff whitespace check
passed. Independent read-only re-review found no remaining concrete findings.
No live authenticated browser, database, email, or end-to-end flow was exercised.
Sage Design OS harness passed; its status/readiness commands completed.
`npm audit` reports 52 dependency vulnerabilities (4 critical, 29 high,
15 moderate, 4 low); no dependency manifests were changed here.

Regression command: `node --test tests/unit/studio-entry.test.mjs`.
Local logs: `/tmp/studio-entry-red-20261108.log`,
`/tmp/studio-entry-review-red-20261108.log`, `/tmp/studio-unit-20261108.log`,
`/tmp/studio-build-20261108.log`, `/tmp/studio-audit-20261108.json`.

# Data integrity security review

Date: 2026-09-04
Scope: migration history, legacy database baseline, RLS/static database policy, remote test boundaries, test-data lifecycle, backup/restore design, and credentials discovered while reviewing persistence tooling.

## Decision

PASS for the safe-local `data-integrity` checkpoint. There are no unresolved critical or high findings in the local implementation. Hosted reconciliation, credential rotation, RLS execution, provider backup verification, and a restore drill remain explicit external-approval gates; this review does not claim they occurred.

Academy certification remains `uncertified`. Lab runtime remains `untrusted_current_runtime`, and lab evidence remains `practice_only`.

## Threats reviewed

- Silent edits, gaps, or duplicate versions in migration history.
- Tables created without row-level security.
- `SECURITY DEFINER` functions with attacker-controlled `search_path` resolution.
- Unreviewed anonymous/public grants and destructive SQL.
- A test command accidentally contacting or mutating a hosted project.
- Reusable test passwords or infrastructure tokens committed to source.
- Seed or cleanup operations running without an explicit mutation approval.
- Backup documentation being mistaken for proved recoverability.

## Findings and disposition

1. **Resolved — embedded hosted RLS target and reusable test credentials.** Five RLS entry points previously defaulted to a real project and repository-published credentials. They now load one fail-closed configuration module. A non-local target requires `RLS_TEST_ALLOW_REMOTE=true`; authenticated checks require secret-managed passwords and a service-role key.
2. **Resolved — unguarded test-data mutation.** Seed and cleanup scripts now require independent approval flags. The approval-boundary audit classifies both commands as external mutations and excludes them from local release verification.
3. **Resolved — tracked infrastructure credential.** A high-entropy metrics token was found in `infra/aws-api/terraform.tfvars`. The tracked runtime file was removed, all Terraform variable files are ignored, and a placeholder-only example was added. The old value must be rotated externally because removal from the working tree cannot invalidate a deployed credential or erase Git history.
4. **Resolved — incomplete baseline coverage.** The first audit revision hash-bound the 14 legacy files but omitted the two foundational schema/seed files. The corrected contract separately hash-binds those files and scans all 131 SQL files for RLS coverage, unsafe definer functions, anonymous grants, and destructive statements.
5. **Pending external approval — credential invalidation.** Rotate the four formerly published test-account passwords and the former metrics token, then confirm they are absent from production. Do not reuse those values in staging.
6. **Pending external approval — hosted proof.** Reconcile the live migration ledger/schema, run tenant and anonymous RLS probes against isolated staging, verify provider backup/PITR settings, and complete an isolated restore drill with measured RPO/RTO.

## Proof reviewed

- `npm run test:data-integrity`: 8/8 contracts passed, including known-good and deliberately broken fixtures.
- `npm run audit:data-integrity`: `local_static_green`; 115 incremental migrations, 14 legacy files, two foundational files, 295/295 created tables with RLS, and 14 definer functions covered.
- Canonical program observer: all 11 commands passed (program, 334 unit tests, security, data integrity, typecheck, lint, build, desktop/mobile Lighthouse, approval boundaries, and diff check).
- Dependency audit: zero production and development findings.
- Added-lines Gitleaks scan: 74.23 KB scanned, zero findings.
- Full tracked-source candidate review: one credible committed token removed; remaining candidates were fixture placeholders, public identifiers, storage keys, prose/examples, and generated evidence labels rather than credentials.

## Residual limitations

Static SQL analysis cannot prove the state of a hosted Supabase project, actual tenant isolation, object-storage recovery, retention, or restore time. Those limitations are preserved as external gates in `data-integrity-audit.json` and the program dependency graph. No database, provider, credential, or deployment mutation was performed in this checkpoint.

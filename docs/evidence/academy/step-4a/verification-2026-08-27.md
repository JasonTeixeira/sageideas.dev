# Academy Step 4A — Local Verification

Date: 2026-08-27

## Proven locally

- Browser stdout is no longer an input to `verifyLab`; learner source code is submitted.
- Requests and responses use separate HMAC contexts, a 60-second freshness window, request replay rejection, and exact request/lab/digest binding.
- Authenticated responses are copied and frozen before receiving the in-process trust marker, preventing post-verification mutation.
- Mastery authorization and the SQL write boundary accept only `academy-evaluator-v1` with policy hash `c6dbbf7e9bcfa3506fa6aa9c3b233dd89f41aa36b6a7a5c63b7095be2668814c`; the contract test detects migration drift.
- Private specs require a reference solution, at least two hidden cases, and a negative case.
- Exact output is required; substring output fails.
- Hidden stdin, expected output, private cases, and reference solutions do not enter Docker arguments or evaluator responses.
- Docker policy requires digest-pinned images, no network, read-only root/source, non-root UID, dropped capabilities, no-new-privileges, CPU/memory/PID/file/tmpfs/output/wall limits, and forced cleanup.
- Missing/invalid specs, missing configuration, evaluator failure, and persistence failure all fail closed to practice-only.
- Generic evidence writes reject both `lab_verified` and `sprint_artifact_created`. The non-lab artifact path revalidates that the published lesson contains a sprint contract and no runnable lab.
- Migration 0116 makes evaluation receipts append-only and commits the receipt plus two mastery events atomically through a service-role-only function. Forward migration 0117 pins the accepted evaluator version/policy even when 0116 was previously applied.
- Evaluator configuration accepts only loopback hosts. Private ingress must terminate before the service.

## Verification results

| Gate | Result |
| --- | --- |
| `npm run academy:lab-evaluator:verify` | PASS — 28/28 tests, registry current, TypeScript clean |
| Node test coverage | PASS — 94.89% lines, 80.63% branches, 95.52% functions |
| Targeted ESLint over Step 4A TypeScript | PASS — zero findings |
| `python3 -m py_compile services/academy-lab-evaluator/runtimes/python-sql/run_sql.py` | PASS |
| `git diff --check` | PASS |
| `npm run academy:audit:verify` | PASS — 12/12 harness tests, registry current, TypeScript clean |

The secure evaluator suite also passed three consecutive runs before final hardening. The final run includes regression cases for response mutation, stale evaluator versions, unknown policy hashes, generic artifact bypass, output bombs, wall-clock exhaustion, non-loopback binding, signature tampering, request replay, and request/lab/digest mismatch.

An independent security follow-up reviewed the hardened code and forward migration. Its initial artifact-bypass, policy-downgrade, public-bind, mutable-response, and migration-rollout findings are closed; the final review reported no remaining findings.

## Repository-wide findings outside this slice

- `npm run build` stops before compilation because Turbopack rejects the worktree's ignored external `node_modules` symlink.
- `npx next build --webpack` reaches compilation, then stops on pre-existing CSS-module purity errors in `app/academy/legal/legal.module.css` and `app/learn/waitlist/waitlist.module.css`.
- `npm audit --omit=dev --audit-level=high` reports 12 existing dependency advisories (10 high, 2 moderate); Step 4A did not introduce or remediate those packages.
- The repository-wide unit command has existing failures outside the Academy evaluator slice. The focused Step 4A contract remains green.

## Deliberately not claimed

- No evaluator service, runtime image, secret, or migration was deployed.
- No live Docker isolation probe ran because the available Docker daemon is not rootless; evaluator preflight correctly refuses that host.
- No private test pack was authored for the 354 current labs.
- No live Supabase receipt was reconciled.
- The migration and RLS/execute-grant contract has structural tests but has not yet been proven against a disposable Supabase/Postgres instance.
- Academy Certification Harness V2 must continue reporting `untrusted_current_runtime` for current labs.

Those are activation/remediation gates, not evidence that this local implementation already operates in production.

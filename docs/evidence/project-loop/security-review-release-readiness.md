# Release Readiness Security Review

- Reviewed: 2026-09-04
- Scope: local release manifest, evidence hashing, checkpoint reconciliation, Git ancestry, runtime requirement inventory, rollback triggers, handoff, and the Local Production Candidate gate
- Result: PASS for safe local code and deterministic evidence
- Unresolved critical/high local findings: none

## Threat model and controls

The release harness decides whether the repository may be called a Local Production Candidate. The relevant threats are stale or edited evidence, skipped workstreams, fabricated trust, secret values in manifests, path traversal, arbitrary Git arguments, a release commit outside the current history, false external-proof claims, and accidental deployment from a local verification command.

The implementation now:

- requires the manifest, state, observations, and canonical inventory to share one program version and inventory hash;
- reconciles every completed safe-local workstream to a unique commit-bound checkpoint;
- requires every canonical observation to have exit code zero and both dependency graphs to report zero known vulnerabilities;
- stores runtime environment variable names only and rejects values or malformed names;
- retains Academy as uncertified and labs as practice-only/untrusted;
- requires five explicit external approval boundaries, a rollback runbook, objective rollback triggers, and post-rollback verification;
- re-runs the manifest contract inside `project:release:verify`, confines evidence paths to the repository, re-hashes each required artifact, and checks the full 40-character release commit as a Git ancestor;
- invokes Git with fixed argument arrays and validates the commit format before it reaches ancestry verification;
- performs no deployment, database, provider, credential, payment, publishing, or other external mutation.

## Deterministic proof

- `npm run test:release-readiness`: 3 tests passed, including known-good, deliberately broken, and gate-wiring/ancestry/hash fixtures.
- The deliberately broken fixture proves rejection of stale inventory, failed observations, dependency findings, missing checkpoints/hashes, secret values, fabricated Academy/lab trust, invalid status, incomplete rollback, skipped approvals, and incomplete handoff.
- `npm run project:program:test`: 10 passed, 0 failed.
- `npm run test:security`: 15 passed, 0 failed in the canonical observer.
- `npm run test:unit`: 334 passed, 0 failed in the canonical observer.
- Typecheck, lint, production build, browser matrices, Lighthouse profiles, SQL integrations, and all 23 canonical observer commands passed.
- Production and development dependency graphs reported 0 vulnerabilities.

## Evidence not claimed

Local Production Candidate is not deployment approval. No CI run, code-host review, Vercel/Supabase staging exercise, hosted migration, live provider transaction, controlled evaluator activation, assistive-technology session, rollback/restore drill, human expert review, or learner beta was performed in this slice.

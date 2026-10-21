# SageIdeas Production Program Loop V1

SageIdeas Production Program Loop V1 is the local, evidence-driven control plane for bringing the complete repository to Local Production Candidate quality. It inventories the project, orders work by dependency, persists progress, creates one bounded task packet at a time, records deterministic verification, and refuses unsupported release, Academy certification, or lab-trust claims.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run project:program:inventory` | Regenerate the canonical filesystem, route, migration, test, and Academy inventory plus the workstream graph. |
| `npm run project:program:plan` | Reconcile persistent state and write the next safe-local task packet, readiness board, and backlog. |
| `npm run project:program:once` | Run inventory, planning, and harness verification once. It does not execute product mutations. |
| `npm run project:program:observe` | Run the deterministic safe-local product gates and record bounded evidence. |
| `npm run project:program:verify` | Prove the harness contract, artifact reconciliation, safety policy, and known-good/known-bad fixtures. |
| `npm run project:program:status` | Report state, current workstream, board status, findings, and trust claims. |
| `npm run project:program:checkpoint -- --evidence=<path>` | Advance exactly one safe-local workstream after every required GREEN gate is evidenced. |
| `npm run project:program:fail -- --fingerprint=<id> --summary=<text>` | Persist a normalized failure and stop after the third identical observation. |
| `npm run project:release:verify` | Fail closed unless every safe-local workstream and deterministic release gate is GREEN. |

## Canonical artifacts

All current evidence lives under `docs/evidence/project-loop/`:

- `canonical-inventory.json`: canonical file list, project surface counts, Git provenance, Academy registry version, and trust posture.
- `dependency-graph.json`: topologically ordered safe-local, external-approval, and human-review workstreams.
- `state.json`: resumable queue, completed checkpoints, current workstream, failure counter, and stop reason.
- `task-packet-latest.json`: one inventory-bound safe-local task with its findings, permitted commands, definition of GREEN, and stop boundaries.
- `observations-latest.json`: bounded outputs and exit codes from the deterministic local product gates plus the dependency audit.
- `verification-latest.json`: proof that the harness, safety rules, artifacts, and fixtures reconcile.
- `production-readiness-board.json`: workstream-level readiness without averaging away blockers.
- `remediation-backlog.json`: deterministic severity/dependency-ranked findings.

The project-loop evidence directory is excluded from its own inventory hash, preventing self-referential hash drift. Source, test, script, configuration, and package changes do change the inventory hash and force observation reconciliation.

## Workstream order

The graph contains 12 safe-local workstreams followed by two hard boundaries:

1. Repository foundation and canonical truth
2. Build, tests, lint, types, and dependency health
3. Authentication, authorization, and application security
4. Data model, migrations, RLS, and persistence integrity
5. Billing and entitlement correctness
6. Critical product journeys and failure recovery
7. Academy curriculum, assessments, and practice labs
8. Admin and operator workflows
9. Email, Discord, background jobs, and automation
10. Accessibility, responsive UX, and performance
11. Observability, incident response, and recovery
12. Local production-candidate release proof
13. Staging deployment and live integration proof — external approval required
14. Human review and controlled beta — required human review

Dependency order is canonical. A checkpoint cannot skip ahead, and external work never enters an autonomous task packet.

## GREEN checkpoint contract

A safe-local workstream advances only when evidence is bound to the current `programVersion`, `inventoryHash`, and `workstreamId`, includes a commit identifier, and proves all of:

- focused tests
- repository unit tests
- typecheck
- lint
- production build
- diff check
- security review

Every checkpoint must keep Academy certification `uncertified` and lab trust either `practice_only` or `untrusted_current_runtime`. The final certification harness, controlled evaluator evidence, required expert judgments, staging proof, and learner beta remain separate authorities.

## Failure and approval boundaries

The program refuses task-packet commands that can push, deploy, mutate Supabase, mutate credentials, trigger paid actions, perform broad destructive operations, or bypass approval controls. It stops on:

- the third consecutive observation of the same normalized failure
- destructive work
- credentials or secret changes
- deployment or other external mutation
- paid actions
- required human review

These boundaries are policy, not missing implementation. Crossing one requires explicit user approval and new evidence.

## Fixture proof

`tests/project-program/fixtures/known-good.json` must pass. `deliberately-broken.json` includes missing required scripts, duplicate migration versions, a dependency cycle, unsafe push/database commands, and fabricated Academy/lab trust. Harness verification fails unless every defect is caught.

## Local Production Candidate meaning

`local_production_candidate` means all safe-local workstreams and deterministic local gates are GREEN with reconciled evidence. It does not mean deployed, certified, live-payment proven, database-migration proven, or human-beta approved. Those remain explicit downstream boundaries.

# Sage Academy — Persistent 32-Course Program Loop

This is the repo-native operating contract for polishing all **32 canonical courses**. The loop works
sequentially: it completes the flagship competency graph first, appends every remaining canonical registry
course, and records a resumable GREEN checkpoint after each bounded course slice.

The authoritative inputs are:

- `data/academy/registry.json` — canonical course, lesson, lab, route, and lifecycle inventory.
- `data/academy/flagship-competency-graph.json` — novice-to-mastery prerequisite order for the flagship path.
- `docs/evidence/academy/certification-v2/remediation-backlog.json` — ranked defects from the certification harness.
- `docs/evidence/academy/program-loop/state.json` — persistent program cursor and completed checkpoints.

Certification Harness V2 remains the certification-readiness authority. The program loop may record a
`green_local_curriculum_checkpoint`; it may not label a course certified.

## Commands

```bash
npm run academy:program:plan
npm run academy:program:once
npm run academy:program:status
npm run academy:program:dry-run
npm run academy:program:verify
npm run academy:program:reconcile -- --evidence=docs/evidence/academy/program-loop/completion-audit-latest.json
```

`academy:program:once` creates the bounded task packet for the persistent coding agent. It does not pretend a
Node process can author or judge curriculum by itself. The agent performs the edits, runs the packet's gates,
records evidence, and advances the state only through an accepted GREEN checkpoint.

## One course iteration

1. Read the current registry-bound task packet.
2. Inspect every lesson, existing lab, scorecard finding, prerequisite, and downstream competency.
3. Write or extend course-specific RED contracts.
4. Remediate teaching, worked examples, practice, debugging, tradeoffs, retrieval, transfer, assessments,
   novice scaffolding, sources, and reference solutions without replacing subject matter with boilerplate.
5. Execute available reference solutions against exact checks. Results remain practice evidence until the
   controlled evaluator is activated.
6. Run focused tests three consecutive times, then the Academy audit, registry check, typecheck, production
   build, and diff check.
7. Review the diff for unrelated changes, unsupported claims, accessibility regressions, and hidden trust
   promotion.
8. Commit one scoped GREEN checkpoint, update the program state, and continue to the next course.

Because course remediation changes content hashes, checkpoint evidence records both the task packet's
`baselineRegistryVersion` and the newly audited `registryVersion`. The transition is accepted only when the
32-course queue, current course, audit artifacts, and trust boundary still reconcile.

## GREEN means locally proven, not certified

A course checkpoint is GREEN only when:

- Course-specific tests achieve `pass^3` — three consecutive clean runs.
- Certification Harness V2 completes with no newly introduced H1, H3, H4, or H5 hard failures.
- Required deterministic dimensions improve or pass, and all remaining review requirements stay explicit.
- Registry generation, typecheck, production build, and `git diff --check` pass.
- Current labs remain `untrusted_current_runtime` or `not_applicable` and contribute no mastery evidence.
- Certification status remains `uncertified` until controlled runtime, expert, human, and governance evidence exists.

## Queue policy

The loop walks the unique course order from the flagship graph first. A graph course repeated by more than one
phase appears once. It then appends all registry courses outside that path in canonical registry order. Queue
construction fails closed if a graph course is missing, a registry slug is duplicated, coverage is not 32/32,
or the registry version drifts from the audit evidence.

## Recovery and stop conditions

The loop stops and surfaces evidence when:

- The same normalized failure fingerprint occurs three consecutive times.
- A registry change cannot be reconciled to the current checkpoint.
- Required expert or human judgment cannot be replaced by deterministic evidence.
- Continuing requires push, deploy, publish, Supabase mutation, credentials, paid actions, destructive operations,
  or another external side effect.
- A proposed change would promote lab trust or course certification without its separate authority.

Local content/code edits, tests, evidence generation, and scoped local commits are allowed. The loop never pushes,
deploys, publishes, changes credentials, mutates Supabase, or performs paid actions without explicit approval.

## Completion condition

Program completion means 32/32 courses have locally proven GREEN curriculum checkpoints and the Academy-wide
platform gates are prepared. World-class certification additionally requires controlled lab evidence, claim-level
source review, expert correctness and pedagogy review, rendered accessibility/performance evidence, human learner
sampling, immutable releases, and governance approval. Those pending dimensions are reported, never inferred.
At completion, `state.current` is `null`; `academy:program:verify` validates the full queue and completion status
without manufacturing another task packet.

If a final Academy-wide closure pass changes content after the 32nd course checkpoint, use
`academy:program:reconcile` with a committed completion-audit artifact. Reconciliation fails closed unless the
state is already 32/32 complete, the baseline registry matches, all 640 lessons and labs have aligned references,
all 32 source ledgers exist, every required local gate is GREEN, deterministic scores remain at least 90, the only
hard failures are the 640 expected H2 practice-runtime blockers, and certification remains `uncertified`. It never
creates a new course checkpoint or promotes lab trust.

# ADR 0003: Academy Certification Harness V2 Authority

**Status:** accepted for local implementation
**Date:** 2026-08-27
**Decision owner:** Academy operator
**Scope:** Academy quality evidence, readiness decisions, and certification boundaries

## Context

The repository had two partial audit paths. `scripts/academy/authoring/audit-courses.ts` validates authored bundle structure and can execute reference solutions in a legacy local process. `scripts/academy/quality/harness.mjs` inspects one live database course and, when credentials and a running app are available, samples rendered evidence. Neither path produces one deterministic answer for every canonical course, and neither current lab runtime is a trustworthy mastery boundary.

## Decision drivers

- One canonical answer for all 32 registered courses and 632 lessons.
- Fail-closed certification behavior when required evidence is missing.
- Reproducible local execution without credentials or mutable external systems.
- Explicit separation between machine checks and expert/human judgment.
- No execution of authored code before the controlled lab boundary exists.
- A reversible migration path for useful legacy diagnostics.

## Considered options

1. **Promote the live per-course harness.** Rejected as the authority because it depends on database state, credentials, and optional rendered infrastructure, and cannot guarantee full-corpus coverage in one run.
2. **Promote the authoring auditor.** Rejected as the authority because its local subprocess execution is not a certification trust boundary and its structural gate does not represent rendered, expert, human, or Academy-level evidence.
3. **Create a registry-driven V2 orchestrator and demote both prior outputs to diagnostics.** Selected because it can audit the complete canonical corpus deterministically while keeping unavailable proof visibly pending.

## Decision

`npm run academy:audit:all`, implemented by `scripts/academy/quality/v2/run.ts`, is the only authority allowed to publish an Academy certification-readiness board.

The V2 runner:

- receives course and lesson identity only from `data/academy/registry.json`;
- audits every registered authoring bundle offline and independently;
- identifies its output with the registry hash and harness version;
- separates deterministic checks, supplied runtime evidence, expert review, and human review;
- treats H1–H5 as non-buy-downable;
- emits `untrusted_current_runtime` for current labs, excludes them from lab points, and blocks every affected lesson;
- leaves unavailable rendered, expert, human, provenance, and performance checks pending;
- never changes `certificationStatus` from `uncertified`; it can only report readiness eligibility.

`scripts/academy/authoring/audit-courses.ts` remains a content-development diagnostic and compatibility component. It is not allowed to publish certification status. Its current reference-solution execution is not imported into V2 because it lacks the Step 4A trust boundary.

`scripts/academy/quality/harness.mjs` remains a legacy bounded live-render/audio diagnostic until its useful probes are moved behind versioned evidence adapters. It now identifies itself as `legacy_diagnostic_only`, always reports `uncertified`, and cannot return a passing certification decision.

## Evidence model

Every required check has one of four states: `pass`, `fail`, `pending`, or `not_applicable`. A dimension is complete only when every required check is complete. A course is merely `eligible_for_certification` when every lesson has zero hard fails, zero required pending checks, and zero failed required checks. Eligibility is not certification; immutable releases and governance sign-off remain Step 8.

The default command is intentionally offline. Remote-link reachability, production accessibility, performance, visual quality, UX quality, claim correctness, and controlled lab execution require separately attributable evidence. Missing evidence remains pending rather than receiving inferred points.

## Security and failure behavior

- The default command does not access Supabase, Stripe, credentials, or production routes.
- The default command does not execute authored Python, JavaScript, SQL, or shell solutions.
- Registry evidence paths must remain repository-relative and confined to the repository root.
- Output filenames derive only from validated canonical slugs.
- Current learner-produced or client-produced lab output cannot write mastery or certification evidence.
- Future controlled evidence must map exactly one passing server-owned result to each unique lab block; duplicate or incomplete result sets fail closed.
- Claim maps marked complete still fail H1 when a declared claim has no valid source IDs.
- A malformed registry bundle, coverage drift, or unregistered lesson fails the run.

## Consequences

Positive consequences:

- The Academy has one reproducible remediation board tied to a registry hash.
- Missing evidence cannot turn into inferred quality points or certification.
- Step 3, Step 4A, Step 5, and Step 8 now have explicit evidence interfaces and ownership.

Negative consequences and accepted trade-offs:

- The initial board is intentionally red and does not preserve optimistic legacy pass labels.
- Rendered and external evidence requires later adapters rather than being fetched opportunistically.
- The checked-in evidence corpus is larger because every course and lesson has an inspectable scorecard.

Step 2 exposes missing proof; it does not manufacture it. Step 3 owns claim-level provenance, Step 4A owns controlled lab evidence, Step 5 owns the final competency/flagship mapping, and Step 8 owns immutable certification releases.

## Related decisions

- ADR 0001 defines the canonical course and lesson registry consumed by V2.
- ADR 0002 keeps packaging and pricing externally blocked and outside certification evidence.

## Rollback

Remove the V2 runner, its package scripts, and its generated `docs/evidence/academy/certification-v2` artifacts. Preserve the Step 1 registry and all historical proof. Rolling back must not restore a legacy pass result as certification authority.

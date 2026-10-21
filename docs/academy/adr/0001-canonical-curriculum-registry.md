# ADR 0001: Canonical Academy Curriculum Registry

**Status:** accepted for local implementation
**Date:** 2026-08-27
**Decision owner:** Academy operator
**Scope:** course/lesson identity, lifecycle state, route identity, audit identity, and runtime projection boundaries

## Context

Academy identity was split across 32 lesson bundles, a 23-course/448-lesson authoring manifest, Supabase rows, `concepts-manifest.json`, `taxonomy.ts`, `catalog.ts`, `learn-catalog.ts`, a static design catalog, and quality proof boards. Those sources can disagree without a failing gate. `apply-course.ts` and the quality harness treated the incomplete manifest or live database metadata as identity authority, while public fallbacks used unrelated fixtures.

That makes course counts, public routes, lab coverage, certification status, and historical learner claims non-reproducible.

## Decision

The Academy uses a composed, deterministic registry contract:

| Concern | Authority | Rule |
|---|---|---|
| Course identity, title, topic, level, lifecycle, aliases | `data/academy/registry.config.json` | Human-reviewed; every discovered lesson bundle must have exactly one row |
| Lesson content | `data/academy/authoring/<course>.lessons.json` | Git-resident authored content |
| Course/lesson snapshot and derived routes/counts | `data/academy/registry.json` | Generated; never hand-edited; content-hashed |
| Capability implementation claims | `data/academy/capability-inventory.json` | Evidence paths required; status vocabulary is closed |
| Legacy manifest | `data/academy/authoring/manifest.json` | Compatibility-only metadata input during migration |
| Supabase course/lesson rows | runtime projection | May determine live availability, but cannot create an unregistered identity |
| Catalog/design/taxonomy fixtures | presentation or prototype data | Cannot define identity, certification, or public counts |
| Quality boards | derived evidence | Must name the registry version they audited |

`npm run academy:registry:write` creates the snapshot and current baseline. `npm run academy:registry:check` fails if config, authored content, capability evidence, or generated registry drift.

All courses begin `draft` and `uncertified`. Existing structural boards do not promote lifecycle or certification state. Certification Harness V2 owns future promotion and must fail closed on untrusted lab evidence.

## Identity and alias policy

- Canonical course slugs are permanent after learner evidence or a public route uses them.
- A rename adds a permanent alias; it does not reuse or delete the old identity.
- Aliases cannot collide with another canonical slug or alias.
- Database, URL, authoring, analytics, certificate, and audit adapters resolve aliases to the canonical slug before reading or writing.
- Lesson aliases are intentionally deferred until immutable releases define their historical semantics.

## Migration and cutover

### Phase A — implemented in this slice

- Snapshot the real 32-course working corpus without modifying the dirty root worktree.
- Generate the canonical 32-course/632-lesson registry and capability inventory.
- Make `apply-course.ts`, the Career OS ingestion path, the quality harness staging path, Academy content loaders, and public catalog fallback resolve registered identities.
- Mark lab evidence `untrusted_current_runtime` for certification purposes.
- Preserve the legacy manifest; never delete historical files or database rows.

### Phase B — dual-read reconciliation

- Read the live database without mutation and compare every course/lesson key, status, title, and route against the registry.
- Emit mismatch telemetry for unknown database identities, aliases used, missing runtime rows, and metadata drift.
- Backfill runtime rows only through a separately reviewed, dry-run-first migration after operator approval.
- Keep legacy manifest reads available only to compatibility tooling while mismatch count reaches zero.

### Phase C — cutover

Cutover is permitted when:

1. registry drift and compatibility tests pass;
2. live DB reconciliation reports zero unexplained course/lesson identities;
3. authoring dry-runs succeed for all registered courses;
4. catalog/runtime routes resolve canonical IDs and approved aliases;
5. both audit entry points receive registry-derived identities; and
6. rollback evidence exists.

After two successful release cycles, rename the legacy manifest to an archived snapshot or generate it as a compatibility projection. Removal requires another ADR. No date is promised before live reconciliation; target review is the end of Step 2.

## Audit authority boundary

This ADR does not create a third quality score. `scripts/academy/quality/harness.mjs` remains the current orchestrator and `scripts/academy/authoring/audit-courses.ts` remains its content-validation component. Step 2 must either retain that relationship or replace it explicitly; only one tool may publish the authoritative certification board.

## Security and failure behavior

- Unregistered identities fail closed before database writes.
- Generated registry data contains no credentials and strips external absolute source paths.
- Registry aliases cannot redirect to arbitrary paths; routes are generated from validated slugs.
- Registry status never upgrades database access or entitlement.
- Current client/output-substring lab signals cannot contribute to certification.
- Live database, Stripe, deployment, and credential mutations remain approval-gated.

## Rollback

Application adapters can return temporarily to legacy reads while the registry files remain additive. Do not delete the registry evidence or the scoped baseline commit. Rolling back identity adapters must not promote any course, restore client-trusted lab certification, or remove learner evidence.

## Consequences

The Academy now has one defensible repository inventory and a failing drift gate. Live database publication truth remains explicitly unverified until Phase B. Immutable course releases remain Step 8A and are not implied by this registry snapshot.

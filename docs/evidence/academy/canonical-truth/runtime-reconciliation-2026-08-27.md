# Academy Runtime Reconciliation Attempt

**Date:** 2026-08-27
**Mode:** read-only
**Registry:** `sha256:874c2f483948e9d0dbead455ca7fd31502895630ad0244733b3cf51add4a6cc3`

## Command

`node --env-file-if-exists=<existing-local-env> scripts/academy/registry/reconcile-runtime.mjs`

## Result

The configured Supabase endpoint returned `TypeError: fetch failed`. No database rows were read or changed. Database course/lesson counts, publication states, and metadata therefore remain `not_verified_in_this_snapshot`.

## Unblock condition

Restore network/DNS reachability to the configured Supabase project, then run `npm run academy:registry:reconcile`. The command is read-only and exits non-zero for unknown database identities, missing runtime rows, or metadata drift.

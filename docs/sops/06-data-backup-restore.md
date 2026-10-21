# Data backup and restore

**Trigger:** Quarterly recovery drill, suspected data loss, migration failure, or approved production recovery.

**Owner:** Platform operator. A second reviewer approves any live restore.

**Inputs:** Target environment, incident or drill ticket, approved recovery point, migration manifest, provider backup inventory.

**Outputs:** Restore evidence, checksums and integrity checks, measured RPO/RTO, reconciliation report, and follow-up actions.

## Recovery contract

- Target recovery point objective (**RPO**): no more than 24 hours of committed application data until provider point-in-time recovery is proven; no more than the configured point-in-time window afterward.
- Target recovery time objective (**RTO**): four hours from approved recovery start to validated service readiness.
- A repository migration audit proves only the local SQL chain. It does not prove that a hosted database is backed up, current, or recoverable.
- Provider retention, storage-object coverage, and point-in-time recovery must be recorded from the active Supabase project before production release.
- Never place database credentials, dumps containing user data, or encryption keys in the repository or proof artifacts.

## Prepare backups

1. Obtain explicit approval before reading from, exporting, or changing a remote database.
2. Confirm the target project identifier and environment with a second operator. Never infer the target from a default URL.
3. Record the provider backup/PITR status, retention window, latest recovery point, region, and storage-object recovery policy.
4. If point-in-time recovery is unavailable, schedule an encrypted logical backup at least daily in an access-controlled store with retention and deletion policies.
5. Hash each approved logical backup and store its checksum separately from the backup. Do not commit either artifact.
6. Alert when the latest restorable point exceeds the RPO or when a backup/checksum operation fails.

## Run an isolated restore drill

1. Obtain approval for the drill and create a time-limited, isolated staging target. A drill must never overwrite production.
2. Record the intended recovery timestamp and start the RTO clock.
3. Restore from the provider recovery point or approved encrypted logical backup.
4. Apply only the repository migrations required after that recovery point, in manifest order.
5. Keep public ingress and outbound automation disabled during validation.
6. Run the integrity checks below using non-production credentials scoped to the isolated target.
7. Record the finish time, achieved RPO/RTO, evidence hashes, exceptions, and reviewer decision.
8. Destroy the isolated target and revoke drill credentials only after the reviewer confirms evidence retention. These are external mutations and require the same approval.

## Integrity checks

The restore is not proven until all applicable checks pass:

1. Migration versions and schema objects reconcile with `supabase/migration-manifest.json` and the deployed migration ledger.
2. Expected table counts and critical business-record counts reconcile against the source snapshot within the approved recovery point.
3. Primary keys, foreign keys, uniqueness constraints, and non-null invariants report no violations.
4. Row-level security is enabled on every application table and the approved anonymous grants match the manifest.
5. Signed-in cross-tenant and anonymous isolation suites pass against the isolated target.
6. Auth identities, application profiles, organization memberships, billing entitlement references, and mastery receipts reconcile without orphaned records.
7. Storage metadata resolves to the expected private objects; missing blobs are reported separately because database PITR may not restore object contents.
8. A read-only application smoke test succeeds while email, billing, Discord, jobs, and mastery writes remain disabled.

## Incident restore

1. Follow the incident commander in [Incident response](05-incident-response.md).
2. Freeze writes or place the affected surface in maintenance mode after approval.
3. Preserve forensic evidence before recovery when compromise is suspected.
4. Have two operators confirm the target, recovery timestamp, blast radius, and rollback point.
5. Restore to an isolated target first whenever the RTO permits; promote only after the integrity checks and security review pass.
6. Re-enable integrations individually, verify idempotency boundaries, and monitor error and audit streams.
7. Publish no customer communication or status update without the required human approval.

## Evidence and review

Attach the provider backup inventory, selected recovery point, commands with secrets redacted, checksums, integrity output, achieved RPO/RTO, reviewer identity, and decision to the incident or drill record. A local dry run may validate this procedure, but only a completed isolated remote restore drill can close the **live recovery evidence** and recovery-readiness gap.

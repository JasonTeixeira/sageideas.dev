# Incident Triage Playbook (Ops-First)

This is the playbook I use when a system breaks at 2AM.

It’s intentionally simple:

- **Stabilize first** (stop the bleeding)
- **Restore service** (even if degraded)
- **Then debug** (root cause)
- **Then prevent** (so it doesn’t happen again)

## 1) Declare + scope the incident

**What’s broken?**

- Customer impact / user-visible symptoms:
- Systems affected:
- Start time (approx):
- Severity (S1/S2/S3):

**Definition of done:**

- What does “service restored” mean in measurable terms?

## 2) Triage checklist (5–10 minutes)

### Confirm it’s real

- Can you reproduce from a clean session?
- Is it isolated to one region/env/tenant?
- Did a deploy happen in the last 30 minutes?

### Identify the blast radius

- Which endpoints / routes are failing?
- Which downstream dependencies are timing out?
- Is it error rate or latency?

### Collect quick signals

- Current error rate (5xx/4xx)
- P95 latency
- Saturation (CPU/mem/db connections)
- Queue depth / retry storms

## 3) Stop the bleeding (stabilize)

Pick the least-risky move that reduces impact:

- Roll back the last deploy
- Disable a feature flag
- Reduce concurrency / worker count
- Increase rate limits temporarily (or tighten if you’re being hammered)
- Shed load (degraded mode)

**Note:** during stabilization, prefer reversible actions.

## 4) Restore service

Once the system is stable, target restore:

- Fix the immediate cause (bad config, missing secret, broken dependency)
- Validate recovery: health checks, synthetic checks, dashboard trend

## 5) Root cause analysis (RCA)

Do this **after** restore:

- What changed?
- Why did it change?
- Why did it reach production?
- Why didn’t monitoring catch it sooner?

## 6) Prevent recurrence (the seasoned part)

Turn the incident into engineering work:

- Add/adjust **SLOs** and alert thresholds
- Add **quality gates** (tests, validation, policy checks)
- Improve **runbooks** and on-call handoffs
- Add **cost guardrails** if the incident was an unexpected spend spike

## Suggested artifacts to attach

- Timeline
- Screenshot(s) of dashboards/logs
- Links to CI run / deploy PR
- The exact command/output that proved the fix

---

If you want a shorter version: **restore first, then learn.**


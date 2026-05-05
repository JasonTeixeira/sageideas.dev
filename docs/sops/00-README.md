# Sage Ideas — Standard Operating Procedures

Each SOP is a repeatable, version-controlled procedure for a specific recurring task. Pull one up, follow the steps, and the work is done correctly without thinking. New SOPs go here as patterns emerge.

## Index

| # | SOP | When to use |
|---|---|---|
| 01 | [Client onboarding](01-client-onboarding.md) | Every new lead → signed engagement |
| 02 | [Invoicing](02-invoicing.md) | Sending invoices, dunning late payers |
| 03 | [Site Starter delivery](03-site-starter-delivery.md) | Every Site Starter (Landing/Marketing/Pro) build |
| 04 | [Care retainer monthly cycle](04-care-retainer.md) | Each month for every active Care client |
| 05 | [Incident response](05-incident-response.md) | Site down, payment failed, client escalation |

## Authoring rules

1. Every SOP starts with **Trigger**, **Owner**, **Inputs**, **Outputs** — so it's clear who runs it and what produces / consumes.
2. Numbered steps. Imperative voice. No fluff.
3. Link to admin URLs by absolute path (`/admin/...`) not host (`https://www.sageideas.dev`) — the runbook covers both.
4. Update via PR. Treat SOPs like code.
5. Keep them <= ~150 lines — if longer, split.

## Related

- `docs/AGENCY_OPERATIONS.md` — top-level operations stack.
- `docs/ADMIN_RUNBOOK.md` — admin app workflows.

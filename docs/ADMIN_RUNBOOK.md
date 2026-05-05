# Sage Ideas Admin Runbook

This runbook documents every admin workflow inside the Sage Ideas studio app. It is written for the agency owner running the platform end-to-end.

All admin URLs assume the production host `https://www.sageideas.dev`. Substitute `http://localhost:3040` when working locally.

---

## 1. First-time setup

### 1.1 Logging in

1. Open `https://www.sageideas.dev/login`.
2. Sign in via the OAuth provider configured in Supabase (Google by default).
3. On first sign-in the system creates a row in `profiles` with `app_role = 'pending'` and `approval_status = 'pending'`.
4. To grant yourself admin access, run the following SQL against the Supabase project (one-time bootstrap):

   ```sql
   update profiles
      set app_role = 'admin', approval_status = 'approved'
    where id = '<your-auth-user-uuid>';
   ```

5. Sign out and back in. The sidebar should now show the **Admin** section with Pipeline, Clients, Activity, and Settings entries.

### 1.2 Studio settings

1. Navigate to `/admin/settings`.
2. Configure the studio profile:
   - **Studio name**, **support email** (defaults to `sage@sageideas.dev`), **billing address**.
   - **Default currency** (USD).
   - **Default hourly rate** (used for profitability calculations when an engagement does not set one explicitly).
3. Save. Values are written to the `studio_settings` table (single-row, upsert by `id = 1`).

### 1.3 Promoting other team members

1. Have the new team member sign in once via OAuth so the `profiles` row exists.
2. Open `/admin/crm` (Clients) or run SQL to set their `app_role` to `admin` or `staff` and `approval_status` to `approved`.
3. They can now see the Admin sidebar group on next page load.

---

## 2. Onboarding a new client

### 2.1 Create the organization (CRM)

1. Open `/admin/crm`.
2. Click **New organization**.
3. Fill in:
   - Display name, primary contact email, website, billing address.
   - Industry, size, source (referral / inbound / outbound).
4. Save. A row is inserted into `organizations`.

### 2.2 Invite the client team

1. From the org detail page click **Invite member**.
2. Enter the client's email and choose `client` role.
3. The system sends a magic-link invite via Resend; the client signs in and the membership is created in `organization_members`.
4. Pending members appear with a yellow banner in the portal until you approve them in `/admin/crm/<org-id>`.

### 2.3 Create the engagement

1. From the org detail page click **New engagement**.
2. Set:
   - **Name** (e.g. "Q3 platform audit").
   - **Stage** (defaults to `lead`).
   - **Contract value** (`contract_value`, total fixed-fee number).
   - **Budget hours** (`budget_hours`, soft cap used by workload + profitability).
   - **Target start / end dates**.
3. Save. The engagement appears on the pipeline kanban.

### 2.4 Kick-off document

1. From the engagement detail page open **Documents**, then **New document**.
2. Pick the **Kickoff brief** template (or start blank).
3. The document renders inside the portal at `/portal/engagements/<id>` for the client; you co-edit from `/admin`.

---

## 3. Pipeline workflow

### 3.1 Stages

The kanban at `/admin/pipeline` has six columns, mapped to the `stage` column on `engagements`:

| Stage        | Meaning                                                          |
|--------------|------------------------------------------------------------------|
| `lead`       | Initial inquiry, no scope yet                                    |
| `discovery`  | Scoping conversations, requirements gathering                    |
| `proposal`   | Proposal drafted or sent, awaiting decision                      |
| `active`     | Signed, work in progress                                         |
| `completed`  | Delivered, all invoices paid                                     |
| `lost`       | Disqualified or declined                                         |

### 3.2 Drag-and-drop persistence

1. Drag an engagement card between columns.
2. The client component fires `PATCH /api/admin/engagements/[id]` with the new stage.
3. The handler updates `engagements.stage` and writes an `audit_log` entry.
4. On success the card animates into its new column. On failure it snaps back and shows a toast.

### 3.3 Auto status updates

When an engagement enters `active` for the first time:

- A **welcome email** is sent to the client primary contact.
- The first **status report** is scheduled (weekly cadence by default).
- Time-tracking is enabled (entries can now be logged against this engagement).

When an engagement moves to `completed`:

- Outstanding invoice reminders pause.
- The client receives a closeout email with the final invoice and a feedback link.

---

## 4. Sending contracts via e-sign

### 4.1 Manage templates

1. Open `/admin/templates`.
2. Pick an existing template (Master MSA, SOW, NDA) or **New template**.
3. Templates are stored as Markdown plus a JSON `variables` schema (e.g. `{client_name}`, `{contract_value}`).

### 4.2 Generate a contract

1. From an engagement detail page click **Send contract**.
2. Choose a template; the variable form is prefilled from the engagement and organization.
3. Click **Generate**. A row is inserted into `contracts` with status `draft` and the rendered Markdown body.
4. Click **Send for signature**. The system:
   - Creates a signed-URL token (`contract_signature_tokens.token`, 14-day expiry).
   - Emails the client primary contact a link of the form `https://www.sageideas.dev/sign/<token>`.
   - Sets `contracts.status = 'sent'`.

### 4.3 Signer experience

1. The client opens the link (no login required — token-gated).
2. They see the rendered contract body, scroll to the bottom, type their name, and draw or type their signature.
3. On submit:
   - `contracts.status` becomes `signed`.
   - `signed_at`, `signer_ip`, `signer_user_agent` are recorded.
   - A countersigned PDF is generated and stored under `contracts/<id>.pdf` in Supabase storage.
   - Both signer and admin receive a completion email.
4. The signed PDF is now visible on the portal Documents tab and from `/admin/templates` history.

---

## 5. Issuing invoices

### 5.1 Create manually

1. Open `/admin/invoices/new`.
2. Pick the organization and engagement.
3. Add line items: description, quantity, unit price. Totals compute automatically.
4. Set **issue date** and **due date** (defaults to net-15).
5. Click **Save draft** to keep editing or **Save and send**.

### 5.2 What the client receives

- An email from `sage@sageideas.dev` with subject `Invoice <number> — Sage Ideas`.
- The body lists totals and a **View invoice** link.
- Clicking the link takes them to `/portal/invoices/<id>` where they can review line items and click **Pay**.

### 5.3 Dunning lifecycle

Invoices carry a `dunning_status` enum that drives automatic reminder emails. The cron job at `/api/cron/dunning` runs daily and advances the state:

| State          | Trigger                                | Action                              |
|----------------|----------------------------------------|-------------------------------------|
| `current`      | Issued, before due date                | None                                |
| `grace`        | 1–3 days past due                      | Soft heads-up email                 |
| `reminded_1`   | 4–10 days past due                     | First reminder email                |
| `reminded_2`   | 11–20 days past due                    | Second reminder, copied to admin    |
| `final_notice` | 21–30 days past due                    | Final notice; pause new work        |
| `collections`  | 31+ days past due                      | Manual review; admin notification   |
| `written_off`  | Manual override                        | Removed from AR, kept in audit log  |

Manual overrides live on the invoice detail page under **Dunning**.

---

## 6. Stripe checkout flow

### 6.1 One-time vs subscription

- **One-time:** invoice with `mode = 'one_time'` → Stripe Checkout in `payment` mode. Used for fixed-fee invoices.
- **Subscription:** services priced via `/portal/catalog` create Stripe subscriptions. The subscription's recurring invoices are mirrored to the `invoices` table by webhook.

### 6.2 Webhook events

The endpoint `/api/stripe/webhook` listens for:

| Event                                | Effect                                                      |
|--------------------------------------|-------------------------------------------------------------|
| `checkout.session.completed`         | Marks the matching invoice `paid`, records `paid_at`        |
| `invoice.paid`                       | Mirrors a subscription invoice as `paid`                    |
| `invoice.payment_failed`             | Sets `dunning_status = 'reminded_1'`                        |
| `customer.subscription.deleted`      | Closes the engagement subscription, sets stage to `completed` if no other active engagements |

Each event is logged to `stripe_webhook_events` (idempotent by `event_id`).

### 6.3 Manually marking paid

If a wire arrives and Stripe was not used:

1. Open the invoice detail page in `/admin/invoices`.
2. Click **Mark paid**, choose method (ACH / wire / check), and confirm.
3. The invoice flips to `paid`, `paid_at` is set to today, and an audit-log row records the manual override.

---

## 7. Time tracking

### 7.1 Logging entries

1. Open `/admin/time-tracking`.
2. Click **New entry**:
   - Engagement, date, hours, description.
   - Toggle **Billable** (`billable = true` by default for active engagements).
3. Save. Entries land in the `time_entries` table.

### 7.2 Profitability

`/admin/profitability` aggregates per-engagement:

- **Revenue:** sum of paid invoices on the engagement (or `engagements.contract_value` if fixed-fee and no invoices yet).
- **Cost:** sum of `time_entries.hours * effective_rate`. The effective rate is the engagement's hourly rate, falling back to `studio_settings.default_hourly_rate`.
- **Margin:** revenue minus cost; the table sorts descending by margin.

The view recomputes on every request — there is no materialised cache.

---

## 8. Workload view

`/admin/workload` shows a grid of weeks (columns) by project or person (rows) with hours summed from `time_entries`.

- Columns span the next 12 weeks by default; use the date picker to shift.
- Cells red above the engagement's `budget_hours / total_weeks` ceiling.
- Click a cell to drill into the underlying entries.

---

## 9. Sending status reports

### 9.1 Generate

1. Open the engagement detail page under `/admin/pipeline/<id>` (or `/admin/projects/<id>`).
2. Click **Status report**.
3. Choose:
   - **AI draft:** calls `POST /api/admin/projects/[id]/status-report` with `mode=ai`. The model summarises last week's deliverables, time entries, and open items.
   - **Manual:** opens an empty Markdown editor.
4. Review, edit, click **Send**.

### 9.2 What the client sees

- Email arrives with subject `Status update — <engagement name>`.
- The body has the rendered Markdown and a **View in portal** link.
- Inside the portal the report appears under `/portal/projects/<id>` → Status reports.

---

## 10. Monitoring

### 10.1 Audit log

`/admin/audit-log` is a paginated, filterable view of every state-changing action: invoice issued, contract signed, engagement stage moved, manual paid override, etc. Each row links to the underlying record.

### 10.2 Notifications inbox

`/portal/inbox` shows in-app notifications for the current user. Admins can see the per-org and per-project notifications they are subscribed to.

### 10.3 Weekly digest cron

- Schedule: Mondays at 14:00 UTC (configured in `vercel.json`).
- Endpoint: `GET /api/cron/weekly-digest`.
- Auth: `CRON_SECRET` required in production; missing secret returns `503` to fail closed.
- Recipients: profiles with `notification_preferences.digest_frequency = 'weekly'` and `approval_status = 'approved'`.
- Body: aggregated activity from the prior 7 days.

---

## 11. Common operations / troubleshooting

### 11.1 Resending welcome emails

1. Open the org page in `/admin/crm/<org-id>`.
2. Find the member; click **Resend welcome**.
3. The system creates a fresh magic-link token and emails it.

### 11.2 Manually marking an invoice paid

See section 6.3.

### 11.3 Voiding an invoice

1. Open the invoice in `/admin/invoices/<id>`.
2. Click **Void**.
3. Confirm. `status` becomes `void`, dunning is paused, and an audit-log row is written. Already-paid invoices cannot be voided — refund via Stripe instead.

### 11.4 Re-sending a contract

1. From the engagement detail page open **Contracts**.
2. Click **Resend** on the contract row. A new token is minted (the old one is invalidated) and a fresh email goes out.

### 11.5 Force-running a cron job

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.sageideas.dev/api/cron/weekly-digest

curl -H "Authorization: Bearer $CRON_SECRET" \
  https://www.sageideas.dev/api/cron/dunning
```

Both return JSON describing what was done.

### 11.6 Diagnosing a missing email

1. Check `/admin/audit-log` for an entry tagged `email.send`.
2. Cross-reference the Resend dashboard for the message status.
3. If Resend shows a bounce, fix the address in `profiles` or `organization_members` and resend.

---

## 12. Site Starter delivery

Site Starter is the productized site-build offering: Landing ($1,500), Marketing ($2,500), Pro ($3,500). Stripe checkout is configured against three live price IDs documented in `STRIPE_PRICE_MAP.md`.

When a Stripe `checkout.session.completed` event fires for a `site-starter-*` tier_slug:
1. The webhook creates an `engagements` row with `tier_slug` and `contract_value`.
2. The client receives an automated welcome email with intake form link.
3. The studio receives a notification email.
4. The engagement appears in `/admin/crm` under "Active engagements."

**Day-by-day delivery process:** see [SOP 03 — Site Starter delivery](sops/03-site-starter-delivery.md). That SOP is templated so the build runs the same way every time, regardless of tier — only page count and CMS scope vary.

**Quality gate before launch:** Lighthouse 95+ across Performance, A11y, SEO, Best Practices on both mobile and desktop. LCP < 1.5s on 4G mobile. Working contact form with spam protection.

**Upsell at handoff:** Site Care ($300/mo) — see [SOP 04 — Care retainer monthly cycle](sops/04-care-retainer.md) for the ongoing workflow.

### 12.1 If a Site Starter Stripe event lands without an engagement row

This indicates the webhook handler missed processing. To recover:
1. Open `/admin/stripe`.
2. Find the session ID under "Recent events."
3. Click "Re-process." The handler runs again idempotently.
4. Verify the `engagements` row was created.

### 12.2 If a client wants to upgrade tiers mid-build

Treat as a change order:
1. Quote the price delta (e.g. Landing → Marketing = +$1,000).
2. Create a Stripe invoice for the delta via `/admin/crm/[engagement-id]/invoices`.
3. Once paid, update the `engagements.tier_slug` and `contract_value`.
4. Adjust scope per the new tier's SOP requirements.

---

## 13. Operations + SOP index

For operations-level tasks (banking, bookkeeping, taxes, customer support inbox, contract storage), see [docs/AGENCY_OPERATIONS.md](AGENCY_OPERATIONS.md).

For repeatable procedures, see the SOP index at [docs/sops/00-README.md](sops/00-README.md):

- SOP 01 — Client onboarding
- SOP 02 — Invoicing
- SOP 03 — Site Starter delivery
- SOP 04 — Care retainer monthly cycle
- SOP 05 — Incident response

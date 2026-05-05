// Phase 31 — 23 document templates seed data.
// Practical, plain-English clauses. Variables use {{snake_case}} syntax.
// Categories map to the contract_templates.category enum:
// 'legal','proposal','sow','change_order','msa','nda','ip','contractor','other'

export interface SeedTemplate {
  slug: string;
  title: string;
  category:
    | 'legal'
    | 'proposal'
    | 'sow'
    | 'change_order'
    | 'msa'
    | 'nda'
    | 'ip'
    | 'contractor'
    | 'other';
  body_md: string;
  variables: { name: string; label: string; type: 'text' | 'number' | 'date' | 'longtext' }[];
}

const v = (name: string, label: string, type: SeedTemplate['variables'][number]['type'] = 'text') => ({ name, label, type });

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ============== ENGAGEMENT (5) ==============
  {
    slug: 'master-services-agreement',
    title: 'Master Services Agreement',
    category: 'msa',
    variables: [
      v('client_name', 'Client legal name'),
      v('client_address', 'Client address', 'longtext'),
      v('effective_date', 'Effective date', 'date'),
      v('governing_state', 'Governing state'),
    ],
    body_md: `# Master Services Agreement

This Master Services Agreement ("Agreement") is entered into as of {{effective_date}} between **Sage Ideas Studio** ("Sage Ideas," "we," "us") and **{{client_name}}** ("Client," "you"), located at {{client_address}}.

## 1. Scope
This is the umbrella contract. Specific work is described in Statements of Work ("SOW") that reference this Agreement. If a SOW conflicts with this Agreement, the SOW wins for that engagement only.

## 2. Fees and Invoicing
- Fees, milestones, and payment terms live in each SOW.
- Net 14 from invoice date unless the SOW says otherwise.
- Late invoices accrue 1.5% per month or the legal max, whichever is lower. We pause work after 21 days late and resume only when the balance clears.

## 3. Intellectual Property
- On full payment, you own the deliverables produced specifically for you.
- We keep our pre-existing tools, libraries, snippets, and frameworks. You get a perpetual, royalty-free license to use them as embedded in the deliverables.
- We may reference the engagement publicly (logo, project name, high-level outcome) unless you ask us not to in writing.

## 4. Confidentiality
Either side's non-public info shared during the work stays confidential for three years after the engagement ends. Standard exceptions: already public, independently developed, legally compelled.

## 5. Warranties
We will perform the work with reasonable skill, in line with what a competent practitioner would do. We do not warrant that the deliverables are bug-free or fit for any specific purpose beyond what the SOW says.

## 6. Liability Cap
Each side's total liability is capped at the fees paid (or due) under the SOW giving rise to the claim in the prior 12 months. Neither side is liable for indirect, consequential, or lost-profits damages. Carve-outs: gross negligence, willful misconduct, IP indemnity, breach of confidentiality.

## 7. Termination
- For convenience: either side, 14 days written notice. You pay for work delivered and committed through the notice period.
- For cause: 10 days to cure a material breach. After that, the non-breaching side can terminate immediately.
- On termination, we hand over work-in-progress in its current state.

## 8. Independent Contractor
We are an independent contractor. Not an employee, partner, or agent. We pay our own taxes and carry our own insurance.

## 9. Disputes
Governed by the laws of {{governing_state}}. Disputes go to binding arbitration in {{governing_state}} unless either side wants to litigate IP injunctive relief in court.

## 10. The Boring But Important Stuff
- Notices: email to the contacts listed in the active SOW counts as written notice.
- This Agreement plus active SOWs is the entire deal. Verbal side-agreements don't count.
- If a court tosses one clause, the rest still stand.

**Signed:**

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'statement-of-work',
    title: 'Statement of Work',
    category: 'sow',
    variables: [
      v('client_name', 'Client legal name'),
      v('project_title', 'Project title'),
      v('start_date', 'Start date', 'date'),
      v('end_date', 'Target end date', 'date'),
      v('total_fee', 'Total fee (USD)', 'number'),
      v('milestones', 'Milestones', 'longtext'),
      v('deliverables', 'Deliverables', 'longtext'),
    ],
    body_md: `# Statement of Work — {{project_title}}

This SOW is governed by the Master Services Agreement between Sage Ideas Studio and **{{client_name}}**.

**Project:** {{project_title}}
**Window:** {{start_date}} → {{end_date}}
**Total fee:** $\{{total_fee}}

## What we're building
{{deliverables}}

## What we're not building
Anything not in the deliverables list above. New scope is a Change Order, not a favor.

## Milestones and payments
{{milestones}}

Payments are billed at each milestone, due Net 14. Work pauses if any invoice goes 21 days late.

## What we need from you
- A single point of contact who can make decisions inside 48 hours.
- Access to systems, accounts, and people we need to do the work.
- Honest feedback fast. Silence reads as approval after 5 business days on any deliverable submitted for review.

## Acceptance
Each deliverable is accepted when (a) you tell us it's accepted, or (b) 5 business days pass without written feedback after we send it for review. Material defects raised in writing during that window get fixed at no extra cost.

## Out of scope
- Ongoing maintenance, hosting, or support after acceptance — separate retainer if you want it.
- Third-party software licenses, infra costs, paid services. You pay these directly.
- Travel — billed at cost with prior approval over $500.

## Assumptions
- The scope above reflects what we know today. If discovery surfaces something materially different, we flag it before burning the budget.
- Decisions don't sit in a queue for weeks. If they do, the timeline slips and we're not on the hook for it.

## Acknowledgement
By signing, you confirm this SOW reflects what we agreed verbally and that no other promises are in play.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'mutual-nda',
    title: 'Mutual NDA',
    category: 'nda',
    variables: [
      v('client_name', 'Other party name'),
      v('effective_date', 'Effective date', 'date'),
      v('governing_state', 'Governing state'),
    ],
    body_md: `# Mutual Non-Disclosure Agreement

Between **Sage Ideas Studio** and **{{client_name}}** ("the parties"), effective {{effective_date}}.

## 1. What's confidential
Anything one party shares with the other that is marked confidential, or that a reasonable person would treat as confidential given the context (product roadmaps, financials, customer lists, code, designs, etc.). Verbal disclosures count if the discloser flags them as confidential within 14 days.

## 2. What's not confidential
- Already public when shared.
- Independently developed without using the other party's info.
- Legitimately obtained from a third party with no NDA.
- Legally required to disclose (subpoena, court order). The compelled party gives prompt notice so the other party can object.

## 3. How we'll handle it
- Use it only to evaluate or pursue the relationship between us.
- Limit access to people who need to know and are bound by similar obligations.
- Same care as we use for our own confidential info — at minimum, reasonable care.

## 4. How long this lasts
Three years from disclosure. Trade secrets stay protected as long as they remain trade secrets under applicable law.

## 5. Return / destruction
On request, return or destroy the other party's materials within 14 days. Backups and legal hold copies can be retained subject to continuing confidentiality.

## 6. No license, no obligation
Sharing info doesn't grant any license, IP, or obligation to do business. Either side can walk away.

## 7. Remedies
Money damages may not cover a leak. Injunctive relief is on the table without needing to post a bond.

## 8. Misc
Governed by the laws of {{governing_state}}. This is the whole agreement on confidentiality between us. Amendments must be in writing.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'one-way-nda',
    title: 'One-way NDA',
    category: 'nda',
    variables: [
      v('client_name', 'Disclosing party name'),
      v('effective_date', 'Effective date', 'date'),
      v('purpose', 'Purpose of disclosure', 'longtext'),
    ],
    body_md: `# One-way Non-Disclosure Agreement

**{{client_name}}** ("Discloser") is sharing confidential information with **Sage Ideas Studio** ("Recipient") effective {{effective_date}} for the purpose of: {{purpose}}.

## 1. Confidential Information
All non-public business, technical, or financial information Discloser shares with Recipient, in any form, identified as confidential or reasonably understood to be so given context.

## 2. Recipient obligations
- Use the information only for the stated purpose.
- Limit access to staff and contractors who need to know and are bound by confidentiality terms at least as strict as these.
- Protect the information with the same care Recipient uses for its own confidential info — at minimum reasonable care.
- Don't reverse-engineer code, binaries, or proprietary methods unless the Discloser explicitly says so.

## 3. Standard carve-outs
Information is not confidential if it (a) is or becomes public through no breach by Recipient, (b) was rightfully known before disclosure, (c) was independently developed without using the information, or (d) is rightfully received from a third party without confidentiality obligations.

## 4. Compelled disclosure
If Recipient is legally required to disclose, Recipient gives the Discloser prompt notice so Discloser can object or seek a protective order.

## 5. Term
Recipient's obligations last three years from the date of each disclosure. Trade secrets stay protected as long as they qualify as trade secrets.

## 6. Return / destruction
On Discloser's written request, Recipient returns or destroys the information within 14 days, except for one archival copy held by counsel and routine backups subject to continuing confidentiality.

## 7. No license
Nothing in this NDA grants Recipient any license to the information or to Discloser's IP.

## 8. Equitable relief
Discloser can seek injunctive relief for breaches without posting a bond.

## 9. Misc
Whole agreement on confidentiality between the parties for this purpose. Amendments in writing only.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'engagement-letter',
    title: 'Engagement Letter',
    category: 'msa',
    variables: [
      v('client_name', 'Client name'),
      v('project_summary', 'Project summary', 'longtext'),
      v('fee_summary', 'Fee summary', 'longtext'),
      v('start_date', 'Start date', 'date'),
    ],
    body_md: `# Engagement Letter

Hi {{client_name}},

Putting our agreement in writing so we both know what we agreed to. This is the short version; if we need a full MSA later, we'll do one.

## What we're doing
{{project_summary}}

## Start date
{{start_date}}

## Fees
{{fee_summary}}

Net 14 on each invoice. Late invoices stop work past day 21.

## How we work
- I'll give you weekly progress updates and flag risks early.
- Decisions need a real owner on your side. If approvals stall for more than 5 business days, the timeline slides and that's on you.
- Anything outside the scope above is a separate quote — not a freebie.

## IP
On full payment, the deliverables are yours. I keep my pre-existing tools and frameworks. I can mention the work publicly at a high level unless you tell me not to.

## Confidentiality
Both directions, 3 years. Standard carve-outs (public info, independently developed, legally compelled).

## Termination
Either side can end this on 14 days' notice. You pay for work delivered and committed through the notice period.

## Liability
Capped at fees paid in the 12 months before any claim. No indirect or consequential damages.

## Independent contractor
I'm a contractor, not an employee. I handle my taxes and insurance.

If this matches what we discussed, sign below and we'll get going.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },

  // ============== PROJECT OPS (4) ==============
  {
    slug: 'change-order',
    title: 'Change Order',
    category: 'change_order',
    variables: [
      v('client_name', 'Client name'),
      v('project_title', 'Project title'),
      v('change_summary', 'Change summary', 'longtext'),
      v('fee_delta', 'Fee delta (USD, +/-)', 'number'),
      v('schedule_delta', 'Schedule delta (days, +/-)', 'number'),
      v('effective_date', 'Effective date', 'date'),
    ],
    body_md: `# Change Order — {{project_title}}

Date: {{effective_date}}
Client: {{client_name}}

## What's changing
{{change_summary}}

## Why
The scope as written in the original SOW didn't cover this. Rather than absorb it and degrade quality elsewhere, we're surfacing it as a formal change.

## Impact

**Fee adjustment:** $\{{fee_delta}} (positive = increase, negative = credit)
**Schedule adjustment:** {{schedule_delta}} business days

## What stays the same
Everything else in the original SOW — scope items not listed here, payment cadence, IP terms, acceptance process — continues unchanged.

## Effect
On signature, this Change Order is incorporated into the SOW. Work on the changed scope begins on countersignature; work on unaffected scope continues uninterrupted.

## Acknowledgement
You're signing because the change is real and the impact is fair. If anything in the impact section feels off, raise it before signing — once it's signed, the deltas are locked.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'project-kickoff',
    title: 'Project Kickoff Document',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('project_title', 'Project title'),
      v('start_date', 'Kickoff date', 'date'),
      v('client_lead', 'Client point of contact'),
      v('north_star', 'North-star outcome', 'longtext'),
    ],
    body_md: `# Kickoff — {{project_title}}

**Date:** {{start_date}}
**Client:** {{client_name}}
**Client lead:** {{client_lead}}
**Studio lead:** Sage Ideas Studio

## North-star outcome
{{north_star}}

If we hit this and nothing else, the project was a success.

## What we believe today
We're starting with hypotheses, not facts. The first two weeks are about killing the bad ones.

## How we'll work
- **Cadence:** weekly 30-minute sync, Mondays. Async update Friday by 5pm.
- **Decision SLA:** client lead resolves blockers in 48 hours or names a delegate.
- **Channel of record:** email + the project portal. Slack DMs don't count.
- **Status colors:** green / yellow / red. We use red. We don't pretend it's yellow.

## Roles
- **Sage Ideas:** builds, writes, decides on craft.
- **Client lead:** prioritizes, approves, unblocks.
- **Stakeholders:** consulted by client lead, not dragged into every meeting.

## What success looks like at +30, +60, +90
- **+30:** discovery done, plan locked, first deliverable in review.
- **+60:** core flows working, tested with real users.
- **+90:** project closeout, handoff, retro.

## Risks we already see
- Decision lag on the client side. Mitigated by the 48-hour SLA above.
- Stakeholder drift. Mitigated by routing all asks through the client lead.
- Scope creep. Mitigated by Change Orders, not "small additions."

## What I need from you in the first week
- Access to the systems and accounts we discussed.
- Calendar holds for the weekly sync.
- A 30-minute call with each stakeholder you want me to talk to.

That's it. We're starting.
`,
  },
  {
    slug: 'milestone-signoff',
    title: 'Sprint / Milestone Sign-off',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('project_title', 'Project title'),
      v('milestone_name', 'Milestone name'),
      v('completion_date', 'Completion date', 'date'),
      v('deliverables_summary', 'Deliverables summary', 'longtext'),
    ],
    body_md: `# Milestone Sign-off — {{milestone_name}}

**Project:** {{project_title}}
**Client:** {{client_name}}
**Completed:** {{completion_date}}

## What was delivered
{{deliverables_summary}}

## What this sign-off means
By signing, you confirm:
1. The deliverables above match what we agreed for this milestone.
2. Material defects have been raised and either fixed or scheduled.
3. The milestone is accepted, the corresponding invoice is approved for payment, and we move on to the next milestone.

## What this sign-off does not mean
- Final acceptance of the whole project (that's a separate closeout).
- Waiver of warranty obligations on this work for the period in the SOW.
- Approval of any out-of-scope additions someone may have requested mid-milestone.

## Open items at sign-off
Anything raised but not addressed in this milestone that needs attention next. List below or write "none."

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'project-closeout',
    title: 'Project Closeout / Acceptance Letter',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('project_title', 'Project title'),
      v('end_date', 'Closeout date', 'date'),
      v('summary_outcomes', 'Outcomes summary', 'longtext'),
    ],
    body_md: `# Project Closeout — {{project_title}}

Client: {{client_name}}
Date: {{end_date}}

This letter wraps up our engagement on **{{project_title}}**. Signing it does three things: it accepts the final deliverables, it triggers the closeout invoice (if any), and it kicks in the warranty period from the SOW.

## What we shipped
{{summary_outcomes}}

## Handoff
- Source files, credentials, and access docs have been transferred to your team.
- Read-me and ops notes are in the project repo.
- I've removed my access to your production systems unless we agreed otherwise.

## Warranty window
For 30 days post-closeout (or whatever the SOW specifies), I'll fix material defects in the delivered work at no extra cost. "Material defect" means something we shipped doesn't do what the SOW said it should — not new feature requests dressed up as bugs.

## Post-launch support
This isn't included by default. If you want me on call for ongoing changes or oncall coverage, we'll set up a retainer separately.

## What I'd like from you
- A short reference quote, if the engagement was a good experience.
- Permission to mention the work in the studio's portfolio (logo + 1-2 sentence summary). Tell me if anything's off-limits.
- A 30-minute retro on what worked and what didn't.

## Final invoice
Any open balance is due Net 14 from the invoice attached / referenced.

Signing below confirms acceptance.

_________________________
{{client_name}}

_________________________
Sage Ideas Studio
`,
  },

  // ============== FINANCIAL (4) ==============
  {
    slug: 'invoice',
    title: 'Invoice',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('client_address', 'Client address', 'longtext'),
      v('invoice_number', 'Invoice number'),
      v('invoice_date', 'Invoice date', 'date'),
      v('due_date', 'Due date', 'date'),
      v('line_items', 'Line items', 'longtext'),
      v('subtotal', 'Subtotal', 'number'),
      v('tax', 'Tax', 'number'),
      v('total', 'Total', 'number'),
    ],
    body_md: `# Invoice {{invoice_number}}

**Sage Ideas Studio**
sage@sageideas.dev
sageideas.dev

**Bill to:**
{{client_name}}
{{client_address}}

**Invoice date:** {{invoice_date}}
**Due date:** {{due_date}} (Net 14)

## Line items
{{line_items}}

| | |
|---|---|
| Subtotal | $\{{subtotal}} |
| Tax | $\{{tax}} |
| **Total due** | **$\{{total}}** |

## Payment
- ACH preferred. Wire instructions on request.
- Credit card via the linked Stripe checkout — surcharge applies.
- Reference invoice number {{invoice_number}} in any payment memo.

## Late terms
Past 14 days: 1.5% monthly interest accrues, or the legal max — whichever is lower.
Past 21 days: active work pauses until balance clears.

Questions on this invoice — reply to this email and I'll get back same day.

— Sage Ideas Studio
`,
  },
  {
    slug: 'receipt',
    title: 'Receipt',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('receipt_number', 'Receipt number'),
      v('payment_date', 'Payment date', 'date'),
      v('payment_method', 'Payment method'),
      v('amount', 'Amount', 'number'),
      v('invoice_reference', 'Invoice reference'),
    ],
    body_md: `# Receipt {{receipt_number}}

**Sage Ideas Studio**
sage@sageideas.dev
sageideas.dev

**Received from:** {{client_name}}
**Date received:** {{payment_date}}
**Method:** {{payment_method}}
**Amount:** $\{{amount}}
**Applied to:** {{invoice_reference}}

This receipt confirms payment was received and applied. The corresponding invoice is now closed. Keep this for your records.

If you spot anything wrong with this receipt — wrong invoice, wrong amount, wrong client — reply within 14 days and we'll fix it. After that we treat it as final.

Thanks.

— Sage Ideas Studio
`,
  },
  {
    slug: 'late-payment-reminder',
    title: 'Late Payment Reminder',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('invoice_number', 'Invoice number'),
      v('amount', 'Amount due', 'number'),
      v('original_due_date', 'Original due date', 'date'),
      v('days_late', 'Days late', 'number'),
    ],
    body_md: `# Friendly nudge on invoice {{invoice_number}}

Hi {{client_name}},

Quick heads-up — invoice **{{invoice_number}}** for **$\{{amount}}** was due {{original_due_date}} and is now {{days_late}} days past due.

I'm guessing it slipped through accounts payable. Happens. Could you confirm it's queued and let me know the expected pay date?

If something's blocking payment — disputed amount, missing PO, wrong contact in AP — tell me now and I'll help unblock it. The sooner I know, the easier this is.

A few things to keep in mind:
- Interest of 1.5% per month begins accruing on day 15 per the SOW.
- If we hit 21 days late, active work pauses until the balance clears. I'd rather not stop momentum.

Reply with the pay date and we move on. Appreciate it.

— Sage Ideas Studio
sage@sageideas.dev
`,
  },
  {
    slug: 'late-payment-final-notice',
    title: 'Late Payment Final Notice',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('invoice_number', 'Invoice number'),
      v('amount', 'Amount due', 'number'),
      v('original_due_date', 'Original due date', 'date'),
      v('days_late', 'Days late', 'number'),
    ],
    body_md: `# Final notice — invoice {{invoice_number}}

{{client_name}},

This is the second and final notice on invoice **{{invoice_number}}** for **$\{{amount}}**, originally due {{original_due_date}}. It's now {{days_late}} days past due.

Where things stand:
- Active work on your engagement is paused as of today.
- Interest is accruing at 1.5% per month on the unpaid balance.
- This invoice is the only remaining item before we resume; everything else is in order on our side.

What I need from you in the next 7 calendar days:
1. Payment in full, or
2. A signed payment plan with specific dates.

If neither happens, the matter goes to collections and the engagement is terminated for cause under the SOW. That means: outstanding balance plus collection costs, no further deliverables, and disengagement of any access we still have to your systems.

I'd rather avoid all of that. So would you. Reply today with how you want to handle it.

— Sage Ideas Studio
sage@sageideas.dev
`,
  },

  // ============== PRIVACY/LEGAL (4) ==============
  {
    slug: 'data-processing-addendum',
    title: 'Data Processing Addendum',
    category: 'legal',
    variables: [
      v('client_name', 'Client (controller) name'),
      v('effective_date', 'Effective date', 'date'),
      v('data_categories', 'Personal data categories', 'longtext'),
      v('data_subjects', 'Categories of data subjects', 'longtext'),
    ],
    body_md: `# Data Processing Addendum

This DPA, effective {{effective_date}}, supplements the agreement between **{{client_name}}** ("Controller") and **Sage Ideas Studio** ("Processor"). When Processor handles personal data on Controller's behalf, the terms below apply.

## 1. Definitions
"Personal data," "controller," "processor," "data subject," "processing," "supervisory authority" have the meanings given in applicable data protection law (GDPR, UK GDPR, CCPA/CPRA, and equivalents).

## 2. Scope of processing
- **Subject matter:** services described in the active SOW.
- **Duration:** while the SOW is active and any post-termination return/destruction window.
- **Purpose:** delivering the contracted services and complying with documented Controller instructions.
- **Categories of data:** {{data_categories}}.
- **Categories of subjects:** {{data_subjects}}.

## 3. Processor obligations
- Process only on documented Controller instructions, including the agreement and SOW.
- Keep personal data confidential — bind staff and subprocessors to obligations at least as strict.
- Implement appropriate technical and organizational security measures (TLS in transit, encryption at rest where reasonable, access controls, audit logging, secure deletion).
- Assist Controller with data subject requests, DPIAs, and breach notifications.
- Notify Controller without undue delay (and within 72 hours) of any confirmed personal data breach.

## 4. Subprocessors
Controller authorizes Processor to engage subprocessors. Processor maintains a current subprocessor list (separate document, available on request) and gives 14 days' notice of additions. Controller can object on reasonable grounds; if unresolved, Controller may terminate the affected services.

## 5. International transfers
Where personal data is transferred out of the EEA / UK, the parties rely on Standard Contractual Clauses (2021) and, for UK transfers, the IDTA or UK Addendum, incorporated by reference. Processor implements supplementary measures where required.

## 6. Audit
Once per year (or after a confirmed breach), Controller may request a written summary of Processor's security controls. Onsite audits at Controller's expense, scheduled with reasonable notice, limited to relevant systems.

## 7. Return / destruction
At end of services, Processor returns or deletes all Controller personal data within 30 days, except where law requires retention.

## 8. Liability
The liability cap in the underlying agreement applies to claims under this DPA. Caps don't limit penalties imposed directly on a party by a supervisory authority for that party's own violations.

## 9. Order of precedence
DPA > SOW > underlying agreement on personal data matters. SOW > DPA on commercial matters.

_________________________
{{client_name}} (Controller)

_________________________
Sage Ideas Studio (Processor)
`,
  },
  {
    slug: 'subprocessor-list',
    title: 'Subprocessor List',
    category: 'legal',
    variables: [
      v('list_date', 'List effective date', 'date'),
    ],
    body_md: `# Subprocessor List

**Sage Ideas Studio**
Last updated: {{list_date}}

This is the live list of third-party providers we use to deliver services. We only add a subprocessor when we genuinely need it, and we vet for security and data handling first.

| Subprocessor | Purpose | Data location | Notes |
|---|---|---|---|
| Supabase (Postgres + Auth) | Application database, authentication, file storage | US (configurable) | Primary data store. SOC 2. |
| Vercel | Application hosting, CDN, serverless compute | US, edge | Frontend + serverless API. SOC 2. |
| AWS (S3, SES, DynamoDB) | Object storage, transactional email, telemetry | US | SES sends transactional email; S3 stores artifacts. |
| Resend | Transactional + marketing email delivery | US | Outbound email pipeline. |
| Stripe | Payment processing, invoice hosting | US, EU | PCI-DSS Level 1. We don't store card data. |
| GitHub | Source control, CI | US | Code only. No client production data. |
| PostHog | Product analytics | US (or EU on request) | First-party, can be disabled per engagement. |
| Cal.com | Scheduling | US | Booking metadata only. |

## Notification of changes
Additions or replacements get 14 days' notice via email to the contract contact. Object on reasonable grounds and we'll work it out — or you can terminate the affected service.

## Audit + due diligence
Each subprocessor is bound by a written contract requiring data protection terms at least as strict as our DPA with you. We re-review annually.

## Questions
sage@sageideas.dev
`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy (template)',
    category: 'legal',
    variables: [
      v('app_name', 'App / product name'),
      v('company_legal_name', 'Company legal name'),
      v('contact_email', 'Privacy contact email'),
      v('effective_date', 'Effective date', 'date'),
    ],
    body_md: `# {{app_name}} — Privacy Policy

Effective {{effective_date}}.

This policy explains what data **{{company_legal_name}}** ("we," "us") collects when you use **{{app_name}}**, why we collect it, and what choices you have. We say things plainly — if anything's unclear, email {{contact_email}} and we'll explain.

## What we collect
- **Account data:** name, email, password hash, profile photo if you upload one.
- **Usage data:** pages visited, features used, device type, IP address. We use this to debug, prioritize, and prevent abuse.
- **Content you provide:** anything you create or upload in the product.
- **Payment data:** handled by Stripe. We see the last four digits and metadata, never the full card number.

## What we don't collect
- We don't sell your data. Ever.
- We don't track you across other websites.
- We don't run third-party advertising trackers in {{app_name}}.

## Why we collect it
- To run the service (you can't have an account without an email).
- To send you emails you asked for, like password resets and product updates you opted into.
- To detect abuse and keep things working.

## How long we keep it
- Account data: until you delete the account, plus a short backup window (~30 days).
- Logs: 90 days, then deleted.
- Backups: rotated on a 30-day cycle.

## Who we share it with
- Subprocessors that help us run the product (hosting, email, payments). The list is in our subprocessor disclosure.
- Authorities, when legally required and we can't push back.
- A buyer, if {{company_legal_name}} is acquired — same protections must continue or we'll require deletion.

## Your rights
You can:
- See what data we have on you.
- Ask us to correct it.
- Ask us to delete it (we'll comply unless we're legally required to keep it).
- Export it.
- Withdraw consent for marketing email any time.

Email {{contact_email}} to make a request. We'll respond within 30 days.

## Cookies
We use functional cookies (login, preferences) and minimal first-party analytics. No third-party advertising cookies.

## Children
{{app_name}} isn't designed for kids under 13 (or 16 in the EU). We don't knowingly collect data from them.

## Security
Encryption in transit, encryption at rest where reasonable, access controls, audit logging. No system is bulletproof — if we have a breach, we'll tell you what happened, what we did about it, and what you should do.

## Changes
If we update this policy in a way that materially changes your rights, we'll notify you by email and post a summary of what changed. Continued use after the effective date means you're okay with the changes.

## Contact
{{contact_email}}
`,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service (template)',
    category: 'legal',
    variables: [
      v('app_name', 'App / product name'),
      v('company_legal_name', 'Company legal name'),
      v('contact_email', 'Contact email'),
      v('effective_date', 'Effective date', 'date'),
      v('governing_state', 'Governing state'),
    ],
    body_md: `# {{app_name}} — Terms of Service

Effective {{effective_date}}.

By using **{{app_name}}**, you agree to these terms with **{{company_legal_name}}** ("we," "us"). They're the rules of the road. Reasonable, plain-language, mostly common sense.

## 1. Your account
You're responsible for what happens under your account. Pick a real password. Don't share credentials. If something looks wrong, email {{contact_email}} fast.

## 2. Acceptable use
Don't use {{app_name}} to:
- Break the law.
- Harm, harass, or impersonate someone.
- Spam, scrape at abusive rates, or attack the service.
- Reverse-engineer the service except where the law says you can.

We reserve the right to suspend accounts that do these things, immediately, no notice required.

## 3. Your content
You keep ownership of what you upload. You grant us a limited license to host, process, and display your content as needed to run the service for you. You promise the content is yours to share and doesn't violate anyone's rights.

## 4. Our service
We work hard to keep {{app_name}} running. We don't promise zero downtime, zero bugs, or that any specific feature stays the same forever. We may add, change, or remove features. We give notice for major changes when we can.

## 5. Pricing
If you're on a paid plan, the price and billing cycle are listed in your account settings. Price changes need 30 days' notice for active subscriptions.

## 6. Cancellation
Cancel any time from account settings. You're charged for the current cycle but won't be billed again. We don't refund partial periods unless required by law.

## 7. Intellectual property
We own the service — code, design, brand. You can't copy or rebuild it. Feedback you send us we can use freely without obligation.

## 8. Privacy
Our privacy policy is part of these terms. Read it.

## 9. Disclaimers
The service is provided "as is." We disclaim warranties to the maximum extent the law allows. Some things, like commerce-fitness or non-infringement warranties, are not guaranteed.

## 10. Liability cap
To the extent the law allows, our total liability is capped at the greater of (a) what you paid us in the prior 12 months or (b) $100. We're not liable for indirect or consequential damages.

## 11. Disputes
Governed by the laws of {{governing_state}}. Disputes go to binding arbitration in {{governing_state}}, except either side can go to court for IP injunctive relief. Class actions waived.

## 12. Termination
We can terminate accounts for breach of these terms. You can stop using {{app_name}} any time.

## 13. Changes
If we materially change these terms, we'll notify you by email and post a summary. Continued use after the effective date means you accept the changes.

## 14. Contact
{{contact_email}}
`,
  },

  // ============== COMMUNICATION (3) ==============
  {
    slug: 'welcome-onboarding-email',
    title: 'Welcome / Onboarding Email',
    category: 'other',
    variables: [
      v('client_first_name', 'Client first name'),
      v('project_title', 'Project title'),
      v('kickoff_date', 'Kickoff date', 'date'),
      v('portal_url', 'Portal URL'),
    ],
    body_md: `Subject: Welcome to {{project_title}} — what happens next

Hi {{client_first_name}},

We're on. Welcome to **{{project_title}}**.

Here's what's queued up for the next week:

1. **Kickoff call:** {{kickoff_date}}. Calendar invite is in your inbox. 30 minutes, focused agenda — no meeting theater.
2. **Portal access:** {{portal_url}}. This is where deliverables land, invoices live, and async updates show up. Bookmark it.
3. **Weekly cadence:** Mondays at the time we agreed. Async update from me Friday by 5pm.

A few things that will make this work well:

- **One decision-maker on your side.** If three people need to sign off on every nudge, we'll bleed velocity. Pick the lead, route everything through them.
- **Use the portal.** DMs and side-channel emails get lost. Anything that matters goes through the portal so we both have a record.
- **Be honest fast.** If something I send feels off, tell me. Sooner is cheaper than later.

What I need from you before kickoff:
- Confirm the scope as written in the SOW still matches what you want.
- Tee up access to the systems we discussed.
- Send over any internal context I don't already have — past attempts, dead-ends, opinions that matter.

Excited to start. Talk soon.

— Sage Ideas Studio
sage@sageideas.dev
`,
  },
  {
    slug: 'post-discovery-recap',
    title: 'Post-Discovery Recap Letter',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('project_title', 'Project title'),
      v('recap_date', 'Recap date', 'date'),
      v('top_findings', 'Top findings', 'longtext'),
      v('recommended_path', 'Recommended path forward', 'longtext'),
    ],
    body_md: `# Post-Discovery Recap — {{project_title}}

Date: {{recap_date}}
Client: {{client_name}}

We finished discovery. Here's the honest read.

## What I found
{{top_findings}}

## What I'm not going to dress up
Some of what I found contradicts assumptions baked into the original brief. I'd rather flag it now than let it surface during build, when it's expensive to course-correct.

## Recommended path forward
{{recommended_path}}

## Tradeoffs I considered
- The faster path optimizes for shipping, but locks in technical debt we'll pay down inside 12 months.
- The thorough path is slower up front but gives us a base that scales without rework.
- The recommended path is the middle: ship the user-facing wins fast, instrument the riskier internals so we can replace them deliberately.

## Risks
- **Schedule:** the original timeline assumed scope X. Reality is X + Y. We either trim scope, extend the window, or accept reduced quality. I prefer trim scope.
- **Stakeholder alignment:** internal stakeholders don't agree on the priority order. That's a leadership call, not a contractor call.
- **Data:** the data we'd need for an evidence-based decision doesn't exist yet. We can stub it and instrument, but the first decision will be partly intuition.

## What I need from you
1. A decision on scope vs. timeline by next Friday.
2. A clear answer on stakeholder priorities — written, not verbal.
3. Permission to start the next phase based on the path we agree to.

Reply with questions, pushback, or a yes. Same-day turnaround beats anything elaborate.

— Sage Ideas Studio
`,
  },
  {
    slug: 'qbr-outline',
    title: 'Quarterly Business Review (QBR) Outline',
    category: 'other',
    variables: [
      v('client_name', 'Client name'),
      v('quarter', 'Quarter (e.g. Q2 2026)'),
      v('engagement_summary', 'Engagement summary', 'longtext'),
    ],
    body_md: `# QBR — {{client_name}}, {{quarter}}

Goal of this meeting: 60 minutes, no theater, three outputs — what worked, what didn't, what we change next quarter.

## Engagement context
{{engagement_summary}}

## Agenda

### 1. Outcomes — 15 min
- What we said we'd ship this quarter.
- What we actually shipped.
- Numbers: engagement KPIs, revenue impact, time-to-decision, whatever you measure.
- Where we beat the plan, where we missed.

### 2. What worked — 10 min
Specific decisions or workflows that paid off. Keep doing these.

### 3. What didn't — 15 min
Specific decisions, processes, or assumptions that cost us. No politics — root cause and fix.

### 4. The next quarter — 15 min
- Top 3 priorities. If we add a 4th, something falls off — say what.
- What needs to be true for the priorities to land.
- Resourcing — am I in the right shape, are you in the right shape.

### 5. Tradeoffs and risks — 5 min
Where we're trading speed for quality, scope for cost, or risk for reward — and whether we're still comfortable.

## Pre-read I'll send 24 hours before
- One-page summary of outcomes vs. plan.
- Top 5 wins and top 3 misses with my honest take.
- Draft priorities for next quarter for you to mark up.

## Post-meeting
Within 48 hours:
- Confirmed priorities for next quarter.
- One paragraph capturing the call (sent to whoever needs it on your side).
- Updated SOW or Change Order if priorities shift the engagement materially.

That's it. Show up with opinions.
`,
  },

  // ============== INTERNAL/OPS (3) ==============
  {
    slug: 'independent-contractor-agreement',
    title: 'Independent Contractor Agreement',
    category: 'contractor',
    variables: [
      v('contractor_name', 'Contractor name'),
      v('contractor_address', 'Contractor address', 'longtext'),
      v('start_date', 'Start date', 'date'),
      v('rate', 'Rate (USD/hr or fixed)', 'number'),
      v('scope', 'Scope of work', 'longtext'),
    ],
    body_md: `# Independent Contractor Agreement

Between **Sage Ideas Studio** ("Studio") and **{{contractor_name}}** ("Contractor"), at {{contractor_address}}, effective {{start_date}}.

## 1. Engagement
Studio engages Contractor as an independent contractor — not an employee. Contractor is free to take other work as long as it doesn't conflict with this engagement.

## 2. Scope
{{scope}}

If something isn't in scope, it isn't in scope. New asks come through Studio with a written change before any extra time is logged.

## 3. Compensation
- Rate: $\{{rate}} (hourly or fixed per scope above — whichever the scope specifies).
- Invoice monthly with hours and a brief work summary. Net 14.
- No reimbursable expenses without prior written approval.

## 4. Independent contractor status
Contractor:
- Sets their own hours and work location (subject to client schedules).
- Provides their own equipment.
- Pays their own taxes (1099 / equivalent issued at year end).
- Carries their own insurance.
- Is not entitled to employee benefits.

## 5. IP assignment
Anything Contractor creates for Studio in connection with this engagement — code, designs, writing, deliverables — is assigned to Studio on creation, or, if assignment isn't possible at that moment, on payment for the work. Contractor keeps their pre-existing tools and grants Studio a perpetual license to anything pre-existing that's embedded in deliverables.

## 6. Confidentiality
Contractor keeps Studio's and Studio's clients' info confidential during and for three years after the engagement. Standard carve-outs (public, independently developed, legally compelled).

## 7. Non-solicitation
For 12 months after the engagement ends, Contractor won't solicit Studio's active clients to bypass Studio. Contractor can still work with anyone — they just can't poach.

## 8. Use of subcontractors
Contractor doesn't subcontract any of this work without Studio's written approval. If approved, Contractor binds the subcontractor to terms at least as strict.

## 9. Termination
- For convenience: either side, 7 days written notice. Studio pays for work delivered through the notice date.
- For cause: 5 days to cure a material breach, then immediate termination by the non-breaching side.
- IP, confidentiality, and non-solicitation survive termination.

## 10. Misc
- Independent contractor relationship — no agency, partnership, or employment created.
- Governed by the laws of the state where Studio's principal office is located.
- Whole agreement on this engagement. Amendments in writing.

_________________________
{{contractor_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'equipment-ip-assignment',
    title: 'Equipment / IP Assignment',
    category: 'ip',
    variables: [
      v('assignor_name', 'Assignor name'),
      v('effective_date', 'Effective date', 'date'),
      v('description', 'Description of assigned work / equipment', 'longtext'),
    ],
    body_md: `# Equipment / IP Assignment

**Assignor:** {{assignor_name}}
**Assignee:** Sage Ideas Studio
**Effective:** {{effective_date}}

## 1. What's being assigned
{{description}}

## 2. Assignment
Assignor irrevocably assigns to Sage Ideas Studio all right, title, and interest — including all intellectual property rights — in the items listed above. Worldwide, in perpetuity, for all purposes.

## 3. Assignor's representations
- Assignor created or lawfully owns the assigned items.
- The assignment doesn't violate any other agreement Assignor is party to.
- The items don't infringe a third party's IP rights as far as Assignor knows.
- Assignor has authority to make this assignment.

## 4. Moral rights
To the extent permitted by law, Assignor waives moral rights and similar rights in the assigned items.

## 5. Further assurances
Assignor will sign whatever paperwork Sage Ideas reasonably needs to record, perfect, or enforce the assignment — including patent, copyright, and trademark filings — at Sage Ideas's expense.

## 6. Equipment, if any
If physical equipment is part of the assignment, Assignor delivers it in working condition by the effective date. Title transfers on physical handover.

## 7. No further compensation
Assignor confirms full consideration for the assignment has been received (typically wages, fees, or equity already agreed under a separate engagement). No further payment is owed for the assignment itself.

## 8. Misc
- Survives termination of any underlying engagement.
- Governed by the laws of the state where Sage Ideas's principal office is located.
- Binding on heirs, successors, and assigns.

_________________________
{{assignor_name}}

_________________________
Sage Ideas Studio
`,
  },
  {
    slug: 'referral-partner-agreement',
    title: 'Referral Partner Agreement',
    category: 'other',
    variables: [
      v('partner_name', 'Partner name'),
      v('effective_date', 'Effective date', 'date'),
      v('commission_rate', 'Commission rate (% or flat USD)'),
      v('commission_term', 'Commission window'),
    ],
    body_md: `# Referral Partner Agreement

Between **Sage Ideas Studio** ("Studio") and **{{partner_name}}** ("Partner"), effective {{effective_date}}.

## 1. The deal
If Partner introduces a prospect to Studio and that prospect signs a paid engagement, Partner gets a referral fee. That's the whole pitch. Nothing exclusive on either side.

## 2. Commission
- **Rate:** {{commission_rate}} of cash collected from the referred client (or flat USD if specified).
- **Window:** {{commission_term}} from the first paid invoice — commission applies to invoices Studio collects in that window.
- **Trigger:** referral is "qualified" when (a) Partner makes the warm intro by email or scheduled call, and (b) the prospect hadn't already engaged Studio in the prior 12 months.
- **Payment:** within 30 days of Studio collecting from the client. Studio sends Partner a 1099 / equivalent at year end if amounts cross the reporting threshold.

## 3. Conflicts and overlap
If two partners introduce the same prospect, the first one to make a documented warm intro gets credit. Studio's records are authoritative for resolving overlap.

## 4. What Partner can and can't do
- Can talk about Studio's services accurately, share public material, and make introductions.
- Can't quote prices, make commitments, or speak on Studio's behalf.
- Can't represent Studio in negotiations.
- Can't use Studio's name or marks except for accurate reference. No fake co-branding.

## 5. Exclusivity
None. Partner can refer to anyone. Studio can take referrals from anyone.

## 6. Independent contractors
Partner is an independent contractor — not an employee, partner, or agent of Studio. Partner pays their own taxes and carries their own insurance.

## 7. Confidentiality
Anything Studio shares about its clients, engagements, or pricing is confidential for 3 years.

## 8. Termination
- Either side, 14 days' notice for any reason.
- Commissions earned before termination still get paid out under section 2.

## 9. Misc
- This is the whole deal on referrals between the parties. Amendments in writing.
- Governed by the laws of the state where Studio's principal office is located.

_________________________
{{partner_name}}

_________________________
Sage Ideas Studio
`,
  },
];

if (SEED_TEMPLATES.length !== 23) {
  // Compile-time guard — if you add/remove templates above, update this line.
  throw new Error(`Expected 23 seed templates, got ${SEED_TEMPLATES.length}`);
}

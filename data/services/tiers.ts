// Sage Ideas Studio service tiers — source of truth.
// Stripe products + prices are LIVE in production.
// Update prices via Stripe dashboard; the unit_amount comments here are for reference only.
//
// Phase 3 expansion: methodology, timeline phases, sample artifact, related work, result metrics, add-ons.

export type Phase = {
  /** Short label shown in the timeline strip (e.g., "Week 1", "Day 1–2"). */
  label: string
  /** Phase title (e.g., "Discovery"). */
  title: string
  /** What happens during this phase, plain prose. */
  description: string
  /** Concrete artifacts produced during this phase. */
  artifacts?: string[]
}

export type AddOn = {
  name: string
  description: string
  price: string
}

export type ResultMetric = {
  /** Headline number (e.g., "47%", "$1.2M", "9 months"). */
  value: string
  /** What it measures. */
  label: string
  /** Short context (e.g., "median client", "after Audit"). */
  context?: string
}

export type SampleArtifact = {
  title: string
  description: string
  /** Filename in /public/artifacts/ — served from CDN. */
  href?: string
  /** Set true while artifacts are still in production. */
  comingSoon?: boolean
}

export type Tier = {
  slug: string
  name: string
  shortName: string
  /** One-line tagline (cyan accent on page). */
  tagline: string
  /** 2–3 sentence positioning paragraph for hero + cards. */
  description: string
  /** Display string ("$1,500", "from $25,000", "$4,900/mo"). */
  price: string
  /** Cents (for Stripe + comparison math). 0 for custom. */
  priceCents: number
  cadence: 'one-time' | 'monthly' | 'custom'
  /** Top-level timeline label ("5 business days", "2 weeks", "Quarterly minimum"). */
  timeline: string
  /** Primary CTA button label. */
  cta: string
  /** Primary CTA destination. */
  ctaHref: string
  stripeProductId?: string
  stripePriceId?: string
  /** True for "flagship" highlight on cards/grid. */
  highlight?: boolean

  /** Service line — drives capability matrix and industry pages. */
  capability:
    | 'strategy'
    | 'web'
    | 'automation'
    | 'seo'
    | 'content'
    | 'brand'
    | 'product'
    | 'platform'
    | 'app'
  /** Mode the engagement runs in. */
  mode: 'audit' | 'sprint' | 'build' | 'operate'

  /** What the client takes away (3–5 outcomes). */
  outcomes: string[]
  /** Concrete deliverables list. */
  deliverables: string[]
  /** Honest scope cuts. */
  notIncluded: string[]
  /** FAQ entries. */
  faq: { q: string; a: string }[]

  /** Phase-by-phase methodology — drives the timeline gantt strip. */
  phases: Phase[]
  /** Typical client outcomes (sourced from past work + benchmarks). */
  resultMetrics: ResultMetric[]
  /** Optional add-ons priced separately. */
  addOns: AddOn[]
  /** Slugs from /data/work/case-studies — case studies that exemplify this tier. */
  caseStudySlugs: string[]
  /** Downloadable sample artifact (PDF in /public/artifacts/). */
  sampleArtifact?: SampleArtifact
  /** Schema.org-friendly summary for JSON-LD Service. */
  schemaSummary?: string
}

export const tiers: Tier[] = [
  // ────────────────────────────────────────────────────────────────────────
  // 1. AUDIT
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'audit',
    name: 'Sage Audit',
    shortName: 'Audit',
    tagline: 'A focused set of eyes on your stack — in one week.',
    description:
      'A focused 5-day strategic audit. We dig into your product, site, infrastructure, or workflow and deliver a prioritized recommendations doc, a Loom walkthrough, and a 60-minute review call. Best for teams who suspect they’re leaving money or velocity on the table.',
    price: '$750',
    priceCents: 75_000,
    cadence: 'one-time',
    timeline: '5 business days',
    cta: 'Buy Sage Audit',
    ctaHref: '/checkout/audit',
    stripeProductId: 'prod_USqd8d3rk4Kgph',
    stripePriceId: 'price_1TTuwTCzAAY45QFM2NkqdEC8',
    capability: 'strategy',
    mode: 'audit',
    outcomes: [
      'Prioritized list of the 10 highest-leverage fixes',
      'Loom walkthrough you can share with your team',
      '60-minute review call to triage next steps',
      'Optional credit toward a follow-on engagement',
    ],
    deliverables: [
      'Recommendations doc (PDF + editable Notion / Google Doc)',
      'Loom walkthrough video (typically 25–35 minutes)',
      'Architecture / SEO / UX scorecard with grades by surface area',
      'Risk register flagging anything urgent (security, compliance, perf)',
      '60-minute synchronous review call with founder + team',
    ],
    notIncluded: [
      'Implementation work (rolls into Ship / Automate / Build)',
      'Long-term retainer',
      'Penetration testing or formal SOC 2 evidence',
    ],
    faq: [
      {
        q: 'What systems can you audit?',
        a: 'Web apps, marketing sites, AI workflows, infrastructure, billing flows, SEO surface area, and developer experience. Stack-flexible — most engagements involve Next.js, Python, AWS, Stripe, or some combination.',
      },
      {
        q: 'Can the cost be applied to a larger engagement?',
        a: 'Yes. If you move forward with Ship, Automate, Build, SEO Sprint, Content Engine, or Brand Sprint within 30 days, the full $750 is credited toward that engagement.',
      },
      {
        q: 'How much access do you need?',
        a: 'Read-only access to the systems we’re auditing — analytics, repo, hosting dashboard, error tracker. We sign a mutual NDA before kickoff.',
      },
      {
        q: 'How is the recommendation list prioritized?',
        a: 'Each item gets an Impact score (1–5), an Effort estimate (hours/days/weeks), and a Confidence level. We sort by Impact / Effort and flag the top 10 explicitly.',
      },
    ],
    phases: [
      {
        label: 'Day 1',
        title: 'Kickoff & access',
        description:
          'Mutual NDA, 30-minute kickoff call to align on the question we’re answering, read-only access to the systems under review.',
        artifacts: ['Signed NDA', 'Kickoff doc', 'Access checklist'],
      },
      {
        label: 'Day 2–3',
        title: 'Deep dive',
        description:
          'We tear down architecture, observability, billing flow, SEO surface, security posture, and developer experience. Every page is read; every dashboard checked.',
        artifacts: ['Internal scorecard', 'Issue inventory'],
      },
      {
        label: 'Day 4',
        title: 'Synthesis',
        description:
          'We rank findings by impact / effort, build the recommendation list, and record the Loom walkthrough.',
        artifacts: ['Recommendations doc draft', 'Loom walkthrough'],
      },
      {
        label: 'Day 5',
        title: 'Review call',
        description:
          '60-minute live review with you and your team. We answer questions, sequence the work, and (if it makes sense) scope the follow-on.',
        artifacts: ['Final recommendations doc', 'Optional follow-on proposal'],
      },
    ],
    resultMetrics: [
      { value: '5 days', label: 'Median delivery', context: 'every audit since 2024' },
      { value: '10', label: 'Top-priority fixes surfaced', context: 'every audit' },
      { value: '40%', label: 'Of audits roll into a Ship/Build', context: 'past 12 months' },
    ],
    addOns: [
      {
        name: 'Compliance posture review',
        description: 'SOC 2 / GDPR / HIPAA gap analysis bolted onto the audit.',
        price: '+$1,000',
      },
      {
        name: 'Stakeholder readout',
        description: 'A second 60-min call presented to your board, investors, or buyer.',
        price: '+$500',
      },
    ],
    caseStudySlugs: ['quality-telemetry', 'aws-landing-zone'],
    sampleArtifact: {
      title: 'Sample Audit Report (redacted)',
      description:
        'A real Sage Audit deliverable — recommendations doc, scorecard, and risk register — with client identifiers redacted.',
      href: '/artifacts/sample-audit-report.pdf',
      comingSoon: true,
    },
    schemaSummary: 'Strategic engineering and SEO audit delivered in 5 business days.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 2. SHIP
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'ship',
    name: 'Ship',
    shortName: 'Ship',
    tagline: 'A production marketing site, in two weeks.',
    description:
      'A 2-week sprint that takes your marketing site from idea to production. Next.js, CMS-backed content, SEO foundation, analytics, and deploy. You get the same engineering discipline we apply to our own products.',
    price: '$2,500',
    priceCents: 250_000,
    cadence: 'one-time',
    timeline: '2 weeks',
    cta: 'Buy Ship',
    ctaHref: '/checkout/ship',
    stripeProductId: 'prod_USqdqz7Zo0kaLb',
    stripePriceId: 'price_1TTuwTCzAAY45QFMbriaQRud',
    capability: 'web',
    mode: 'sprint',
    outcomes: [
      'Live, fast, indexable marketing site',
      'CMS your team can update without engineering',
      'Analytics and SEO foundation in place from day one',
      '90+ Lighthouse across Performance, A11y, SEO, Best Practices',
    ],
    deliverables: [
      'Up to 8 pages, fully responsive, dark + light mode if requested',
      'CMS-backed content (Sanity or Contentful)',
      'Analytics + sitemap + robots + structured data',
      'Vercel production deploy + DNS + SSL handoff',
      'One custom integration (forms, CRM, booking)',
      'Open Graph + favicon + brand assets pipeline',
      '30 days of post-launch support',
    ],
    notIncluded: [
      'Logo / brand identity design (BYO or add-on, or pair with Brand Sprint)',
      'Long-form copywriting (we provide structure + edits)',
      'Custom illustrations or video',
    ],
    faq: [
      {
        q: 'Do you write the copy?',
        a: 'We provide structure, headlines, and edits. Long-form copywriting is available as an add-on or via a separate engagement (Content Engine).',
      },
      {
        q: 'What if I need more than 8 pages?',
        a: 'Each additional page is $400, or we scope this into a Build engagement instead.',
      },
      {
        q: 'What stack do you ship on?',
        a: 'Next.js (App Router) on Vercel, Sanity or Contentful for CMS, Tailwind for styling, Resend for transactional email. We use this exact stack on our own products.',
      },
      {
        q: 'Can you migrate me from WordPress / Webflow / Framer?',
        a: 'Yes — that’s a common Ship scenario. We handle redirects, SEO preservation, and content migration.',
      },
    ],
    phases: [
      {
        label: 'Day 1–2',
        title: 'Discovery & wireframes',
        description:
          'Brand audit, sitemap, content inventory, low-fi wireframes for every page. We confirm IA before any code is written.',
        artifacts: ['Sitemap', 'Wireframes', 'Content brief'],
      },
      {
        label: 'Day 3–6',
        title: 'Design & build',
        description:
          'Tokens, type system, component library, page-by-page implementation. Daily Vercel previews — no surprises at the end.',
        artifacts: ['Design tokens', 'Component library', 'Daily preview deploys'],
      },
      {
        label: 'Day 7–10',
        title: 'Content & integrations',
        description:
          'CMS schemas, content load-in, custom integration, analytics, SEO. Performance pass to land 90+ Lighthouse.',
        artifacts: ['CMS instance', 'Analytics dashboard', 'Lighthouse report'],
      },
      {
        label: 'Day 11–14',
        title: 'Launch',
        description:
          'DNS cutover, monitoring, redirects from old site, post-launch QA, handoff doc, training session.',
        artifacts: ['Production site', 'Handoff doc', 'Loom training video'],
      },
    ],
    resultMetrics: [
      { value: '14 days', label: 'Time to production', context: 'guaranteed' },
      { value: '95+', label: 'Median Lighthouse score', context: 'across past Ship sites' },
      { value: '<1.5s', label: 'Median LCP', context: 'measured on production' },
    ],
    addOns: [
      {
        name: 'Long-form copywriting',
        description: 'Up to 6,000 words across all pages, written and edited in your voice.',
        price: '+$2,000',
      },
      {
        name: 'Brand Sprint pairing',
        description: 'Ship + Brand Sprint as one engagement — saves $500 vs. buying separately.',
        price: '$4,500 combined',
      },
      {
        name: 'Bilingual / i18n',
        description: 'Set up next-intl + content schemas for a second language.',
        price: '+$1,500',
      },
    ],
    caseStudySlugs: ['nexural', 'jobpoise', 'trayd'],
    sampleArtifact: {
      title: 'Ship deliverables index',
      description: 'PDF showing the exact artifacts produced in a typical Ship engagement.',
      href: '/artifacts/ship-deliverables.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'Production-grade marketing site built on Next.js + CMS + analytics in 2 weeks.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 3. AUTOMATE
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'automate',
    name: 'Automate',
    shortName: 'Automate',
    tagline: 'One critical workflow, automated end-to-end.',
    description:
      'A 3-week sprint that takes one workflow — onboarding, billing, support, lead routing, content production — and automates it end-to-end with monitoring, error handling, and a runbook your team can actually operate.',
    price: '$3,500',
    priceCents: 350_000,
    cadence: 'one-time',
    timeline: '3 weeks',
    cta: 'Buy Automate',
    ctaHref: '/checkout/automate',
    stripeProductId: 'prod_USqd2Cqcof2kLz',
    stripePriceId: 'price_1TTuwUCzAAY45QFMe7KlDE7F',
    highlight: true,
    capability: 'automation',
    mode: 'sprint',
    outcomes: [
      'One workflow runs without human supervision',
      'Monitoring + alerting in place — you know when it breaks',
      'Runbook your team can operate independently',
      'Cost-of-ops baseline established + tracked',
    ],
    deliverables: [
      'Workflow design + architecture diagram (Excalidraw + written)',
      'End-to-end implementation (LLM orchestration, integrations, fallbacks)',
      'Monitoring + alerting (Sentry / CloudWatch / Slack)',
      'Operator-facing dashboard for visibility',
      'Cost telemetry — token spend, run rate, exception rate',
      'Runbook + handoff session',
      '30 days of post-launch support',
    ],
    notIncluded: [
      'LLM token spend (passed through at cost)',
      'Long-term retainer (rolls into Operate)',
      'Multi-tenant or customer-facing automation (rolls into Build)',
    ],
    faq: [
      {
        q: 'Which LLM stack do you use?',
        a: 'Whatever fits the job. Default to Claude or GPT-4-class models with structured outputs. Shipped against OpenAI, Anthropic, and open-source via Bedrock.',
      },
      {
        q: 'Can you integrate with my existing tools?',
        a: 'Yes — Stripe, HubSpot, Salesforce, Notion, Slack, Gmail, Linear, and most modern SaaS via REST APIs are in scope. Anything weirder gets sized in discovery.',
      },
      {
        q: 'How do you handle hallucinations / failure modes?',
        a: 'Every workflow ships with structured output validation, deterministic fallbacks, and a human-in-the-loop checkpoint where stakes warrant it. Monitoring surfaces drift early.',
      },
      {
        q: 'What about prompt injection / safety?',
        a: 'Inputs are validated, prompts are templated (never string-concatenated from user input), and tool-use is gated by allow-lists. Standard practice — not negotiable.',
      },
    ],
    phases: [
      {
        label: 'Week 1',
        title: 'Workflow design',
        description:
          'Map the existing manual workflow end-to-end. Identify the deterministic steps (rules) vs. the AI-suited steps (judgment, extraction, generation). Architecture diagram + cost model.',
        artifacts: ['Workflow diagram', 'Cost model', 'Risk register'],
      },
      {
        label: 'Week 2',
        title: 'Build',
        description:
          'Implementation, prompt engineering, integrations, dashboards. Daily preview environment — your team can poke at it.',
        artifacts: ['Production code', 'Dashboard', 'Integration tests'],
      },
      {
        label: 'Week 3',
        title: 'Monitor + handoff',
        description:
          'Production deploy, alerting wired in, runbook written, training session with the team that will operate it.',
        artifacts: ['Runbook', 'Monitoring config', 'Loom training video'],
      },
    ],
    resultMetrics: [
      { value: '21 days', label: 'Median time to production', context: 'guaranteed' },
      { value: '70–90%', label: 'Manual hours eliminated', context: 'typical workflow' },
      { value: '<2%', label: 'Exception rate at steady state', context: 'measured at 30 days' },
    ],
    addOns: [
      {
        name: 'Second workflow',
        description: 'Layer on a second related workflow during the same engagement.',
        price: '+$5,000',
      },
      {
        name: 'Compliance review',
        description:
          'Data flow analysis for SOC 2 / HIPAA / GDPR — what data goes where, with which sub-processors.',
        price: '+$1,500',
      },
      {
        name: 'Operate handoff',
        description: 'Roll into Operate at month 1 — first month at 50% off.',
        price: '$1,250 first month',
      },
    ],
    caseStudySlugs: ['alphastream', 'quality-telemetry'],
    sampleArtifact: {
      title: 'Automate workflow specification',
      description: 'Anonymized workflow diagram + spec from a past Automate engagement.',
      href: '/artifacts/automate-spec.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'End-to-end workflow automation with LLM orchestration, monitoring, and runbook in 3 weeks.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 4. SEO SPRINT (NEW)
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'seo-sprint',
    name: 'SEO Sprint',
    shortName: 'SEO Sprint',
    tagline: 'Technical SEO + on-page foundation, fixed in 30 days.',
    description:
      'A 30-day audit + fix sprint that gets your technical SEO right. Crawl health, Core Web Vitals, schema, internal linking, on-page optimization, and programmatic SEO scaffolding. Built for teams who want compounding organic traffic without a full retainer.',
    price: '$1,500',
    priceCents: 150_000,
    cadence: 'one-time',
    timeline: '30 days',
    cta: 'Buy SEO Sprint',
    ctaHref: '/checkout/seo-sprint',
    stripeProductId: 'prod_USqdo9jeizsLmt',
    stripePriceId: 'price_1TTuwUCzAAY45QFMH0NlU0CP',
    capability: 'seo',
    mode: 'sprint',
    outcomes: [
      'Every technical SEO blocker fixed — crawl, schema, vitals, sitemaps',
      'Programmatic SEO scaffolding for templated landing pages',
      'Tracking dashboard: rankings, clicks, vitals, indexation',
      '60 days of post-sprint support to monitor and tune',
    ],
    deliverables: [
      'Technical SEO audit (200+ checkpoint)',
      'Core Web Vitals fixes — LCP, CLS, INP under threshold sitewide',
      'Schema.org coverage: Organization, Service, Article, FAQ, Breadcrumb',
      'Internal linking strategy + implementation',
      'Programmatic SEO architecture (template pages, dynamic content)',
      'Sitemap, robots, canonical, hreflang configuration',
      'GSC + Bing Webmaster setup, validation, monitoring',
      'Tracking dashboard (Looker Studio or hosted)',
      '60-day post-sprint monitoring',
    ],
    notIncluded: [
      'Long-form content writing (use Content Engine)',
      'Paid media / PPC',
      'Outbound link building (we focus on earned + on-page)',
    ],
    faq: [
      {
        q: 'How fast will I see results?',
        a: 'Technical fixes can move rankings within 2–4 weeks of indexation. Programmatic pages typically start ranking in 4–8 weeks. Long-form compounds over 3–9 months — that’s where Content Engine takes over.',
      },
      {
        q: 'What CMS / stack do you support?',
        a: 'Next.js, WordPress, Webflow, Framer, Shopify, Contentful, Sanity, custom. If your stack can serve clean HTML and respect canonicals, we can fix it.',
      },
      {
        q: 'Will you guarantee specific traffic numbers?',
        a: 'No — anyone who promises a number is lying. We guarantee the technical work is done correctly and the dashboard accurately measures whatever happens next.',
      },
      {
        q: 'Do you do off-page / link building?',
        a: 'Not as outbound. We focus on earning links via Content Engine + technical excellence. If you need an outbound link partner, we can refer trusted ones.',
      },
    ],
    phases: [
      {
        label: 'Week 1',
        title: 'Audit',
        description:
          'Full technical crawl, Core Web Vitals baseline, schema coverage analysis, GSC + GA review, competitor benchmarking. Output: prioritized fix list.',
        artifacts: ['SEO audit report', 'Fix priority matrix'],
      },
      {
        label: 'Week 2',
        title: 'Technical fixes',
        description:
          'Highest-leverage technical work first — schema, vitals, internal linking, indexation, redirects. Daily PRs.',
        artifacts: ['PRs in your repo', 'Updated sitemaps', 'Schema coverage report'],
      },
      {
        label: 'Week 3',
        title: 'Programmatic + on-page',
        description:
          'Programmatic SEO architecture for templated pages, on-page optimization for top-priority URLs, FAQ schema rollout.',
        artifacts: ['Template pages live', 'On-page changes shipped'],
      },
      {
        label: 'Week 4',
        title: 'Dashboard + handoff',
        description:
          'Tracking dashboard built in Looker Studio (or hosted alternative), monitoring alerts wired up, training session, 60-day support handoff.',
        artifacts: ['Tracking dashboard', 'Runbook', 'Monitoring alerts'],
      },
    ],
    resultMetrics: [
      { value: '200+', label: 'SEO checkpoints in audit', context: 'every sprint' },
      { value: '30 days', label: 'Median time to first ranking lift', context: 'past sprints' },
      { value: '95+', label: 'Lighthouse SEO score', context: 'sitewide post-sprint' },
    ],
    addOns: [
      {
        name: 'Content Engine pairing',
        description: 'SEO Sprint + Content Engine first month at 50% off — total $2,250.',
        price: '$2,250 first month',
      },
      {
        name: 'Migration / replatform',
        description: 'If you’re also moving CMS or rebuilding the site, we manage redirects + SEO preservation.',
        price: '+$2,000',
      },
      {
        name: 'International SEO',
        description: 'Hreflang setup for up to 3 locales + locale-specific schema.',
        price: '+$1,500',
      },
    ],
    caseStudySlugs: ['nexural', 'jobpoise'],
    sampleArtifact: {
      title: 'SEO audit template',
      description:
        'A redacted SEO Sprint audit deliverable — what 200+ checkpoints actually look like.',
      href: '/artifacts/seo-audit-template.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'Technical SEO audit and 30-day fix sprint with programmatic SEO scaffolding and post-sprint monitoring.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 5. CONTENT ENGINE (NEW)
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'content-engine',
    name: 'Content Engine',
    shortName: 'Content',
    tagline: 'Editorial-grade long-form, every week, for compounding reach.',
    description:
      'A monthly engine that produces 4 long-form pieces (2,000+ words), distribution kits for LinkedIn / X / newsletter, an internal linking strategy that compounds, and a performance dashboard. Quarterly minimum.',
    price: '$1,500',
    priceCents: 150_000,
    cadence: 'monthly',
    timeline: 'Quarterly minimum',
    cta: 'Subscribe to Content Engine',
    ctaHref: '/checkout/content-engine',
    stripeProductId: 'prod_USqduB616gq9pC',
    stripePriceId: 'price_1TTuwVCzAAY45QFMBDMOFGhy',
    capability: 'content',
    mode: 'operate',
    outcomes: [
      '4 long-form pieces per month — research-backed, editorially tight',
      'Distribution kit for every piece (LinkedIn, X, newsletter)',
      'Internal linking strategy that compounds month-over-month',
      'Performance dashboard: traffic, rankings, conversions',
    ],
    deliverables: [
      '4 long-form articles per month (2,000+ words each, with original research)',
      'Editorial calendar 4–8 weeks out',
      'SEO brief per piece (target keyword, search intent, related entities)',
      'Distribution kit per piece: LinkedIn post, X thread, newsletter blurb',
      'Internal linking + topic cluster strategy',
      'Original diagrams / illustrations where useful',
      'Monthly performance dashboard + tactical adjustments',
      'Quarterly strategic review',
    ],
    notIncluded: [
      'Paid promotion / boosted posts (separate budget)',
      'Outbound link building',
      'Video production (use a video partner — we can recommend)',
      'Customer interviews or original research outside what’s in scope per piece',
    ],
    faq: [
      {
        q: 'Who actually writes the articles?',
        a: 'Sage Ideas writes, edits, and publishes — using AI assistance for first drafts and an engineer-editor pass for accuracy. Every article is reviewed by someone who has shipped in your space before it’s published.',
      },
      {
        q: 'Will the content be AI-detectable / generic?',
        a: 'No. AI assists with research and structure; voice, examples, and arguments are human-driven. We test against AI detectors and our pieces consistently read as human-written. We refuse to ship slop.',
      },
      {
        q: 'How long until I see organic traffic?',
        a: 'Articles typically index in days, gain initial rankings in 4–8 weeks, and compound over 3–9 months. We pair with SEO Sprint for fastest results.',
      },
      {
        q: 'Can I see the topic plan before signing?',
        a: 'Yes — a 30-min strategy call before subscribing produces a sample 4-week editorial calendar. No commitment until you’re happy with it.',
      },
      {
        q: 'What if I want a specific writer / SME?',
        a: 'Discuss in discovery. For specialist domains (legal, medical, hard-tech finance) we bring in a credentialed reviewer at +$750/mo.',
      },
    ],
    phases: [
      {
        label: 'Month 1',
        title: 'Foundations',
        description:
          'Topic cluster strategy, editorial calendar, voice guide, distribution playbook, dashboard setup. First 4 pieces shipped.',
        artifacts: ['Editorial calendar', 'Voice guide', 'Dashboard', '4 articles live'],
      },
      {
        label: 'Month 2',
        title: 'Compounding',
        description:
          'Pieces 5–8 ship. Internal linking strengthens. Distribution playbook refined based on Month 1 metrics.',
        artifacts: ['4 articles', 'Updated link map', 'Distribution analysis'],
      },
      {
        label: 'Month 3',
        title: 'Strategic review',
        description:
          'Pieces 9–12 ship. Quarterly review reads what’s working and what isn’t. Adjust topic mix, deepen what’s converting.',
        artifacts: ['4 articles', 'Quarterly review doc', 'Refined Q2 plan'],
      },
    ],
    resultMetrics: [
      { value: '12', label: 'Long-form pieces / quarter', context: 'guaranteed' },
      {
        value: '3–9 mo',
        label: 'Median compounding window',
        context: 'before sustained organic lift',
      },
      {
        value: '2,000+',
        label: 'Words per piece',
        context: 'minimum — many pieces ship at 3,000+',
      },
    ],
    addOns: [
      {
        name: 'SME reviewer',
        description: 'Credentialed reviewer (legal, medical, regulated finance) per piece.',
        price: '+$750/mo',
      },
      {
        name: 'Newsletter operations',
        description:
          'We run your newsletter end-to-end on Resend or Beehiiv — list growth, weekly cadence, segmentation.',
        price: '+$800/mo',
      },
      {
        name: 'Video repurpose',
        description: 'Each long-form piece repurposed into a 60-second YouTube Short + LinkedIn video.',
        price: '+$900/mo',
      },
    ],
    caseStudySlugs: ['nexural', 'alphastream'],
    sampleArtifact: {
      title: 'Sample editorial calendar',
      description: 'A 4-week editorial calendar from a past engagement with topic clusters mapped.',
      href: '/artifacts/content-editorial-calendar.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'Monthly long-form content engine with 4 pieces, distribution kit, and performance dashboard.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 6. BRAND SPRINT (NEW)
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'brand-sprint',
    name: 'Brand Sprint',
    shortName: 'Brand',
    tagline: 'Verbal + visual identity, ready to ship — in 2 weeks.',
    description:
      'A 2-week brand identity sprint. Verbal identity (positioning, voice, messaging), visual identity (logo, type, color, motion), brand guidelines, and web-ready design tokens. Delivered with a Figma library and a Notion brand book.',
    price: '$2,500',
    priceCents: 250_000,
    cadence: 'one-time',
    timeline: '2 weeks',
    cta: 'Buy Brand Sprint',
    ctaHref: '/checkout/brand-sprint',
    stripeProductId: 'prod_USqdUg0rXMEpPt',
    stripePriceId: 'price_1TTuwVCzAAY45QFMFmiu6pUC',
    capability: 'brand',
    mode: 'sprint',
    outcomes: [
      'A brand identity that looks like it belongs to a real company',
      'Verbal system: positioning, voice, taglines, messaging hierarchy',
      'Visual system: logo, type, color, spacing, motion principles',
      'Production-ready design tokens — no friction handing off to web build',
    ],
    deliverables: [
      'Positioning + messaging house (Notion brand book)',
      'Voice + tone guide with do/don’t examples',
      'Primary + secondary logo set (SVG, PNG, monochrome, favicon)',
      'Type system (display, body, mono) with web-loaded fallbacks',
      'Color system with WCAG AA contrast pairs',
      'Spacing scale + radius scale + shadow system',
      'Motion principles (durations, easings, signature gestures)',
      'Figma library with components, variants, and tokens',
      'Web-ready design tokens (CSS variables + Tailwind config)',
      'Brand guidelines PDF + Notion brand book',
    ],
    notIncluded: [
      'Marketing site implementation (pair with Ship)',
      'Photography / video production',
      'Trademark search / legal registration (we recommend a partner)',
      'Print collateral beyond the basics',
    ],
    faq: [
      {
        q: 'How is this different from a logo design?',
        a: 'A logo is one deliverable. Brand Sprint produces an identity system — verbal and visual — that you can deploy across web, deck, email, and social without it feeling like the logo is the whole brand.',
      },
      {
        q: 'Can you work from an existing brand?',
        a: 'Yes. A Brand Sprint that refines/extends an existing identity is the same scope and price — we audit what works, formalize what’s missing, and deliver the system.',
      },
      {
        q: 'How many logo options do I see?',
        a: 'Three concept directions in week 1, refined to one before week 2 begins. We don’t ship 30 mediocre options — we ship 3 considered ones.',
      },
      {
        q: 'What about trademark / legal?',
        a: 'We do basic conflict checks (Google, USPTO TESS) but a final trademark search is the client’s legal counsel’s job. We can refer trademark attorneys.',
      },
    ],
    phases: [
      {
        label: 'Day 1–3',
        title: 'Strategy',
        description:
          'Positioning workshop, audience map, competitor teardown, voice exercises. Output: messaging house + creative brief.',
        artifacts: ['Messaging house', 'Voice guide', 'Creative brief'],
      },
      {
        label: 'Day 4–7',
        title: 'Visual concepts',
        description:
          'Three concept directions (logo, type, color, sample applications). Live presentation. Pick one.',
        artifacts: ['3 concept directions', 'Application mocks'],
      },
      {
        label: 'Day 8–11',
        title: 'System',
        description:
          'Refine chosen direction into a full system. Build the Figma library. Token everything for web handoff.',
        artifacts: ['Figma library', 'Tokens (CSS + Tailwind)'],
      },
      {
        label: 'Day 12–14',
        title: 'Documentation + handoff',
        description:
          'Brand book in Notion + PDF. Loom walkthrough. Handoff session with anyone who’ll deploy the brand.',
        artifacts: ['Brand book', 'Loom training', 'Handoff session'],
      },
    ],
    resultMetrics: [
      { value: '14 days', label: 'Time to delivered system', context: 'guaranteed' },
      { value: '3', label: 'Considered logo directions', context: 'never 30' },
      {
        value: 'AA',
        label: 'WCAG contrast on every color pair',
        context: 'shipped, not promised',
      },
    ],
    addOns: [
      {
        name: 'Brand Sprint + Ship combo',
        description: 'Bundle Brand Sprint into a Ship engagement — saves $500.',
        price: '$4,500 combined',
      },
      {
        name: 'Pitch deck template',
        description: 'Branded Keynote + Google Slides + PowerPoint deck system.',
        price: '+$1,500',
      },
      {
        name: 'Naming sprint',
        description:
          '5-day naming sprint before the brand sprint — generated, screened, validated.',
        price: '+$2,500',
      },
      {
        name: 'Custom illustration set',
        description: 'A library of 12 custom SVG illustrations in your brand voice.',
        price: '+$3,500',
      },
    ],
    caseStudySlugs: ['nexural', 'jobpoise', 'trayd'],
    sampleArtifact: {
      title: 'Sample brand book (Nexural)',
      description: 'Full brand system from a past Brand Sprint, redacted for sensitive details.',
      href: '/artifacts/brand-book-sample.pdf',
      comingSoon: true,
    },
    schemaSummary: 'Two-week verbal + visual brand identity sprint with full design system and tokens.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 7. SCALE (renamed conceptually — kept slug for SEO continuity)
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'scale',
    name: 'Scale',
    shortName: 'Scale',
    tagline: 'SEO + Content Engine running in lockstep — the compounding stack.',
    description:
      'The compounding stack. Programmatic SEO architecture, 8 long-form articles per month, technical SEO maintenance, distribution, and monthly reporting. Built for teams who want a real organic moat in their category.',
    price: '$1,200',
    priceCents: 120_000,
    cadence: 'monthly',
    timeline: 'Quarterly minimum',
    cta: 'Subscribe to Scale',
    ctaHref: '/checkout/scale',
    stripeProductId: 'prod_USqd3Lu3vAjyYC',
    stripePriceId: 'price_1TTuwVCzAAY45QFM7DJ5UI0P',
    capability: 'seo',
    mode: 'operate',
    outcomes: [
      'Compounding organic traffic — typically 3–9 month payback',
      'A content moat in your category',
      'Technical SEO that does not regress',
      'Distribution that compounds with the content library',
    ],
    deliverables: [
      'Programmatic SEO architecture (template pages, internal linking)',
      '8 long-form articles per month',
      'Technical SEO audit + monthly maintenance',
      'Distribution kit per piece (LinkedIn, X, newsletter)',
      'Monthly performance report + roadmap',
      'Quarterly strategic review',
    ],
    notIncluded: [
      'Paid media / ads (separate engagement)',
      'Outbound link building (we focus on earned + on-page)',
    ],
    faq: [
      {
        q: 'How is Scale different from SEO Sprint + Content Engine?',
        a: 'Scale runs them as one engagement at a discounted combined rate vs. buying separately ($1,500 SEO Sprint + $1,500/mo Content Engine if standalone; Scale is $1,200/mo with programmatic SEO and a leaner ongoing content cadence — 8 lighter pieces vs. 4 long-form, no SME review by default).',
      },
      {
        q: 'How fast will I see results?',
        a: 'Programmatic pages can index within weeks. Long-form articles compound over 3–9 months. We do not promise specific traffic numbers.',
      },
      {
        q: 'Do you write the articles?',
        a: 'We write, edit, and publish. AI-assisted, human-edited — every article is reviewed by an engineer who has shipped in your space.',
      },
    ],
    phases: [
      {
        label: 'Month 1',
        title: 'Foundations',
        description:
          'Programmatic SEO architecture, 8 articles, dashboard setup, distribution playbook.',
        artifacts: ['Programmatic templates', '8 articles', 'Dashboard'],
      },
      {
        label: 'Month 2',
        title: 'Cadence',
        description: '8 more pieces. Internal linking strengthens. Distribution refines.',
        artifacts: ['8 articles', 'Updated link map'],
      },
      {
        label: 'Month 3',
        title: 'Strategic review',
        description: '8 more pieces + quarterly review.',
        artifacts: ['8 articles', 'Quarterly review doc'],
      },
    ],
    resultMetrics: [
      { value: '24', label: 'Long-form pieces / quarter', context: 'guaranteed' },
      { value: '3–9 mo', label: 'Compounding window', context: 'typical' },
      { value: 'compounds', label: 'Combined SEO + content moat', context: 'over 3–9 months' },
    ],
    addOns: [
      {
        name: 'SME reviewer',
        description: 'Credentialed reviewer per piece for regulated industries.',
        price: '+$750/mo',
      },
      {
        name: 'Newsletter operations',
        description: 'Run your newsletter end-to-end on Resend or Beehiiv.',
        price: '+$800/mo',
      },
      {
        name: 'Video repurpose',
        description: 'Each long-form piece into a 60s Short + LinkedIn video.',
        price: '+$900/mo',
      },
    ],
    caseStudySlugs: ['nexural', 'alphastream', 'jobpoise'],
    sampleArtifact: {
      title: 'Scale 90-day plan template',
      description: 'A 90-day Scale roadmap with topic clusters and programmatic SEO map.',
      href: '/artifacts/scale-90-day-plan.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'Combined SEO + content retainer with programmatic SEO, 8 articles/mo, distribution, and reporting.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 8. BUILD
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'build',
    name: 'Build',
    shortName: 'Build',
    tagline: 'Site + app + automation + SEO. Live in one sprint.',
    description:
      'The flagship engagement. A 4–12 week sprint where we take a business from idea or fragmented stack to a coherent, AI-native production system. Custom scope, custom proposal, starts after a 30-minute discovery call.',
    price: 'from $9,500',
    priceCents: 950_000,
    cadence: 'custom',
    timeline: '4–12 weeks',
    cta: 'Book a Discovery Call',
    ctaHref: '/book?tier=build',
    stripeProductId: 'prod_USqdFfz02SK1tX',
    stripePriceId: 'price_1TTuwWCzAAY45QFM46D4YAhM',
    highlight: true,
    capability: 'product',
    mode: 'build',
    outcomes: [
      'A live, full-stack business in production',
      'Site + app + automation + SEO under one strategy',
      '90 days of operator-grade support post-launch',
    ],
    deliverables: [
      'Marketing site (Ship-equivalent)',
      'Custom application (Next.js + Supabase / FastAPI)',
      'AI workflow automation (Automate-equivalent)',
      'SEO foundation + initial content',
      'Stripe billing + customer accounts',
      'Analytics + monitoring + runbooks',
      'Architecture documentation + handoff',
    ],
    notIncluded: [
      'Native iOS / Android (we recommend a parallel native engagement)',
      'Hardware / IoT integrations',
    ],
    faq: [
      {
        q: 'How is the price determined?',
        a: 'Discovery call → fixed-fee proposal within 48 hours. We almost never bill hourly. Most Build engagements land between $35k and $80k.',
      },
      {
        q: 'What is the deposit?',
        a: '25% kickoff deposit, then milestone-based invoicing. Net 30.',
      },
      {
        q: 'Who actually writes the code?',
        a: 'Sage Ideas + a curated bench of trusted specialists when scope warrants. Every line of code is reviewed by Jason. No offshore unsupervised contractors.',
      },
      {
        q: 'What if scope changes?',
        a: 'Change orders go in a written addendum with their own price + timeline impact. No surprise bills.',
      },
    ],
    phases: [
      {
        label: 'Week 0',
        title: 'Discovery & proposal',
        description:
          'Discovery call → fixed-fee proposal within 48 hours. Mutual NDA, MSA, SOW. Kickoff once signed.',
        artifacts: ['Proposal', 'MSA', 'SOW'],
      },
      {
        label: 'Week 1–2',
        title: 'Architecture & design',
        description:
          'System architecture, data model, brand if needed, design system, IA. Daily Vercel previews.',
        artifacts: ['Architecture diagram', 'Design system', 'Wireframes'],
      },
      {
        label: 'Week 3–8',
        title: 'Build',
        description:
          'Site + app + automation + SEO foundation. Weekly demos, milestone invoices, daily preview deploys.',
        artifacts: ['Production code', 'Weekly demo Looms', 'Milestone invoices'],
      },
      {
        label: 'Week 9–12',
        title: 'Launch + 90-day support',
        description:
          'Production launch, monitoring, training, runbooks. 90 days of operator-grade support included.',
        artifacts: ['Production system', 'Runbooks', 'Handoff session'],
      },
    ],
    resultMetrics: [
      { value: '4–12 wk', label: 'Engagement length', context: 'fixed at scoping' },
      { value: '90 days', label: 'Post-launch support', context: 'included' },
      { value: '0', label: 'Surprise change orders', context: 'in past Builds' },
    ],
    addOns: [
      {
        name: 'Compliance package',
        description: 'SOC 2 readiness controls, audit trail, vendor docs, DPIA.',
        price: '+$3,500',
      },
      {
        name: 'Year-1 Operate retainer',
        description: 'Roll into Operate with the first month at 50% off.',
        price: '$1,250 first month',
      },
      {
        name: 'Brand Sprint pairing',
        description: 'Add a Brand Sprint into Build at a $500 discount.',
        price: '+$2,000',
      },
    ],
    caseStudySlugs: ['nexural', 'jobpoise', 'trayd', 'aws-landing-zone'],
    sampleArtifact: {
      title: 'Sample Build proposal',
      description: 'Anonymized Build proposal showing scope, milestones, and pricing structure.',
      href: '/artifacts/build-proposal-sample.pdf',
      comingSoon: true,
    },
    schemaSummary: 'Full-stack site + app + automation + SEO build engagement (4–12 weeks).',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 9. OPERATE
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'operate',
    name: 'Operate',
    shortName: 'Operate',
    tagline: 'Engineering ownership on retainer. About twenty hours a week.',
    description:
      'A monthly fractional CTO engagement. ~20 hours/week of focused engineering, architecture, and ownership of one critical surface area. Best for post-Build clients and growing SMBs without an in-house technical lead.',
    price: '$2,500',
    priceCents: 250_000,
    cadence: 'monthly',
    timeline: 'Quarterly minimum',
    cta: 'Subscribe to Operate',
    ctaHref: '/checkout/operate',
    stripeProductId: 'prod_USqdHwCxN8zJam',
    stripePriceId: 'price_1TTuwWCzAAY45QFMMREodlzr',
    capability: 'platform',
    mode: 'operate',
    outcomes: [
      'A dedicated engineer who owns one critical surface area',
      'Weekly syncs + async availability',
      'Architecture decisions you can stand behind',
    ],
    deliverables: [
      '~20 hours/week of focused engineering',
      'Weekly sync + written status',
      'Async availability via Slack / Linear',
      'Architecture review on all major changes',
      'On-call coverage during launches',
    ],
    notIncluded: [
      'Hiring or managing an in-house team (advisory only)',
      'Production support beyond launch windows',
    ],
    faq: [
      {
        q: 'Can I scale this up to full-time?',
        a: 'Operate is capped at 20 hrs/week. For more, it converts to a Build sprint or a multi-month custom engagement.',
      },
      {
        q: 'What is the minimum commitment?',
        a: 'One quarter (3 months). After the first quarter, month-to-month with 30 days notice.',
      },
      {
        q: 'How do you split time across multiple clients?',
        a: 'Operate is capped — we never run more concurrent Operate engagements than we can responsibly serve. Our calendar is transparent.',
      },
    ],
    phases: [
      {
        label: 'Week 1',
        title: 'Onboarding',
        description:
          'Access provisioning, architecture review, top-priority list, comms cadence agreed.',
        artifacts: ['Onboarding doc', 'Top-priority list'],
      },
      {
        label: 'Ongoing',
        title: 'Operate',
        description: '~20 hrs/week. Weekly sync. Written status. Architecture reviewed. Code shipped.',
        artifacts: ['Weekly status', 'PR reviews', 'Shipped features'],
      },
      {
        label: 'Quarterly',
        title: 'Strategic review',
        description: 'Quarterly review — what shipped, what didn’t, what changes for next quarter.',
        artifacts: ['Quarterly review doc'],
      },
    ],
    resultMetrics: [
      { value: '20 hrs/wk', label: 'Engineering capacity', context: 'guaranteed' },
      { value: '24h', label: 'Async response SLA', context: 'business days' },
      { value: '1', label: 'Surface area owned end-to-end', context: 'per engagement' },
    ],
    addOns: [
      {
        name: 'On-call coverage extension',
        description: 'Extended on-call beyond launch windows — pager + 30-min response.',
        price: '+$800/mo',
      },
      {
        name: 'Hiring partner',
        description: 'I help you hire your first engineer — JD, sourcing, interview rubric.',
        price: '+$1,500 one-time',
      },
    ],
    caseStudySlugs: ['aws-landing-zone', 'quality-telemetry'],
    sampleArtifact: {
      title: 'Sample Operate weekly status',
      description:
        'A redacted weekly Operate status doc — what fractional CTO ownership looks like in practice.',
      href: '/artifacts/operate-weekly-status.pdf',
      comingSoon: true,
    },
    schemaSummary: 'Fractional CTO retainer — 20 hrs/week of engineering ownership.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 10. APP DEVELOPMENT — purpose-built web apps for small teams
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'app-development',
    name: 'App Development',
    shortName: 'App Dev',
    tagline: 'A purpose-built web app for your small team — spec, prototype, build, launch.',
    description:
      'A custom app build for small teams. We start with a free chat to confirm an app is the right answer, write a tight spec, prove the riskiest flow with a clickable prototype, then build a hardened production app with auth, data, integrations, tests, and monitoring. Web-first with mobile-friendly responsive design.',
    price: 'from $6,500',
    priceCents: 650_000,
    cadence: 'custom',
    timeline: '4–10 weeks',
    cta: 'Book a Discovery Call',
    ctaHref: '/book?tier=app-development',
    stripeProductId: 'prod_URzrMgS4T1XMhB',
    stripePriceId: 'price_1TT5rTEDeyGfkojJojR1ygzw',
    capability: 'app',
    mode: 'build',
    outcomes: [
      'A live, custom web app your team and customers can use',
      'A spec, a prototype, then a real production app — in that order',
      'Tests, monitoring, and a runbook so the app survives without me',
      'Mobile-friendly responsive design out of the box',
    ],
    deliverables: [
      'Free 20-minute intro chat',
      'Plain-English product spec with milestone-based pricing',
      'Clickable prototype of the riskiest flow',
      'Production app: auth, database, UI, integrations',
      'Cross-device QA + accessibility + perf + security passes',
      'Loom + written runbook + two weeks of bug-fix support',
    ],
    notIncluded: [
      'Native iOS / Android apps (web-first; we ship responsive web apps and PWAs)',
      'Long-term hosting bills (your AWS / Vercel / Render account, your costs)',
      'Open-ended scope expansion (changes go through written change-control)',
    ],
    faq: [
      {
        q: 'Why does the price start at $6,500?',
        a: 'Real apps need auth, data, tests, and monitoring on day one — not after launch. The starting price covers a tight scope with those baked in. Bigger apps quote higher; small internal tools may quote lower.',
      },
      {
        q: 'Web app or native app?',
        a: 'Web-first. Modern web apps install to home screens, work offline, and ship 10x faster than native. If you genuinely need native, I will say so on the intro call and refer out.',
      },
      {
        q: 'Can you take over an existing app?',
        a: 'Yes — start with Sage Audit ($750) so I understand the codebase, then we scope a continuation engagement honestly.',
      },
      {
        q: 'What if my idea is too small for $6,500?',
        a: 'Then it might be a Ship (marketing site), an Automate (one workflow), or a Build (broader engagement). The free intro chat is the fastest way to find out.',
      },
    ],
    phases: [
      {
        label: 'Day 0',
        title: 'Free intro chat',
        description:
          'A 20-minute call to decide whether an app is the right answer at all and which scope fits.',
        artifacts: ['Honest fit check', 'Web vs native vs no-code recommendation'],
      },
      {
        label: 'Day 1–4',
        title: 'Spec & price',
        description:
          'A short product spec capturing users, jobs, screens, data model, and milestone-based pricing.',
        artifacts: ['Product spec', 'Wireframes', 'Milestone pricing'],
      },
      {
        label: 'Week 1–2',
        title: 'Working prototype',
        description:
          'A clickable prototype proves the core flow before we invest in the full build.',
        artifacts: ['Clickable prototype', 'Confirmed data model'],
      },
      {
        label: 'Week 2–7',
        title: 'Production build',
        description:
          'Real app build — auth, database, UI, integrations, tests, monitoring, observability.',
        artifacts: ['Daily-updated staging', 'Weekly demo + status', 'Test + monitoring baseline'],
      },
      {
        label: 'Week 7–8',
        title: 'QA & polish',
        description:
          'Cross-device QA, accessibility, performance, and a security pass before launch.',
        artifacts: ['QA log', 'Accessibility report', 'Lighthouse + security pass'],
      },
      {
        label: 'Week 8–10',
        title: 'Launch & handoff',
        description:
          'Production cutover with a rollback plan, monitoring alerts, and a runbook your team can run.',
        artifacts: ['Live app', 'Loom + runbook', 'Two weeks of bug-fix support'],
      },
    ],
    resultMetrics: [
      { value: '4–10 wks', label: 'Spec to launch', context: 'typical engagement' },
      { value: '<2.5s', label: 'Largest contentful paint', context: 'on launch' },
      { value: '95+', label: 'Lighthouse score', context: 'desktop & mobile' },
    ],
    addOns: [
      {
        name: 'Mobile-shell app (PWA polish)',
        description: 'Installable PWA with offline support and push notifications.',
        price: '+$1,200 one-time',
      },
      {
        name: 'Stripe / payment integration',
        description: 'One-time + subscription billing wired and tested.',
        price: '+$900 one-time',
      },
      {
        name: 'Care for the app',
        description: 'Roll into Operate retainer ($2,500/mo) for ongoing pager + improvements.',
        price: 'See Operate',
      },
    ],
    caseStudySlugs: ['nexural', 'jobpoise', 'trayd'],
    sampleArtifact: {
      title: 'Sample app spec template',
      description:
        'A redacted product spec for a small-team web app — users, jobs, screens, data model, milestones.',
      href: '/artifacts/app-spec-template.pdf',
      comingSoon: true,
    },
    schemaSummary:
      'Custom web app development — spec, prototype, production build, QA, launch, optional Care.',
  },
  // ────────────────────────────────────────────────────────────────────────
  // 11. SITE STARTER — Landing
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'site-starter-landing',
    name: 'Site Starter — Landing',
    shortName: 'Landing',
    tagline: 'A 1-page Next.js landing site, mobile-first, in 5 business days.',
    description:
      'A 1-page Next.js landing site. Mobile-first responsive design, contact form wired to email, analytics in place, deployed to production. 5 business day turnaround. One round of revisions included.',
    price: '$1,500',
    priceCents: 150_000,
    cadence: 'one-time',
    timeline: '5 business days',
    cta: 'Get Started',
    ctaHref: '/services/site-starter',
    stripeProductId: 'prod_USqdcbFVZaoQWx',
    stripePriceId: 'price_1TTuwXCzAAY45QFMGhtzKmyC',
    capability: 'web',
    mode: 'sprint',
    outcomes: [
      'Live 1-page Next.js landing site, mobile-first',
      'Contact form wired to your email',
      'Google Analytics or Plausible installed',
      'Deployed to Vercel with custom domain',
    ],
    deliverables: [
      'One responsive landing page (hero, features, social proof, CTA, footer)',
      'Contact form with spam protection',
      'Analytics integration',
      'Open Graph + favicon',
      'Vercel deploy + DNS handoff',
      'One round of revisions',
    ],
    notIncluded: [
      'Multiple pages (use Site Starter Marketing or Pro)',
      'CMS (use Site Starter Pro or Ship)',
      'Custom illustration or video',
    ],
    faq: [
      {
        q: 'What if I need a second page later?',
        a: 'Each additional page is $400, or upgrade to Site Starter Marketing ($2,500) for 4 pages.',
      },
      {
        q: 'Do I own the code?',
        a: 'Yes. The repository transfers to your GitHub org or stays in mine — your call.',
      },
      {
        q: 'What if I need ongoing changes?',
        a: 'Add Site Care ($300/mo) — copy edits, perf tuning, small feature tweaks, cancel anytime.',
      },
    ],
    phases: [
      {
        label: 'Day 1',
        title: 'Kickoff',
        description: 'Brand intake, content checklist, wireframe approval.',
        artifacts: ['Wireframe', 'Content checklist'],
      },
      {
        label: 'Day 2-3',
        title: 'Build',
        description: 'Page implementation, mobile-first responsive, form wiring, analytics.',
        artifacts: ['Preview deploy', 'Form test'],
      },
      {
        label: 'Day 4',
        title: 'Revisions',
        description: 'One revision pass on copy, layout, color, type.',
        artifacts: ['Revised preview deploy'],
      },
      {
        label: 'Day 5',
        title: 'Launch',
        description: 'DNS cutover, production deploy, Loom handoff.',
        artifacts: ['Live site', 'Loom walkthrough'],
      },
    ],
    resultMetrics: [
      { value: '5 days', label: 'Time to live', context: 'guaranteed' },
      { value: '95+', label: 'Lighthouse', context: 'mobile + desktop' },
      { value: '<1.5s', label: 'LCP', context: 'on launch' },
    ],
    addOns: [
      {
        name: 'Site Care retainer',
        description: 'Monthly upkeep on the new site — patches, copy edits, small tweaks.',
        price: '$300/mo',
      },
      {
        name: 'Extra revision round',
        description: 'A second round of revisions if the first round did not land it.',
        price: '+$250',
      },
    ],
    caseStudySlugs: [],
    schemaSummary: 'Single-page Next.js landing site delivered in 5 business days.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 12. SITE STARTER — Marketing
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'site-starter-marketing',
    name: 'Site Starter — Marketing',
    shortName: 'Marketing',
    tagline: 'A 4-page marketing site, SEO-ready, in 7-10 business days.',
    description:
      'A 4-page marketing site (Home, Services, About, Contact). SEO foundation, structured data, sitemap, mobile-first responsive design, deployed to production. 7-10 business day turnaround. Two rounds of revisions.',
    price: '$2,500',
    priceCents: 250_000,
    cadence: 'one-time',
    timeline: '7-10 business days',
    cta: 'Get Started',
    ctaHref: '/services/site-starter',
    stripeProductId: 'prod_USqddCpBiJZuli',
    stripePriceId: 'price_1TTuwXCzAAY45QFMieufvkDB',
    capability: 'web',
    mode: 'sprint',
    outcomes: [
      'Live 4-page marketing site (Home, Services, About, Contact)',
      'SEO foundation: schema, sitemap, robots, OG',
      'Mobile-first responsive on every page',
      'Two rounds of revisions',
    ],
    deliverables: [
      'Four pages: Home, Services, About, Contact',
      'Schema.org Organization + Service + Breadcrumb',
      'Sitemap, robots, canonical configured',
      'Contact form with spam protection',
      'Analytics (Google Analytics or Plausible)',
      'Open Graph + favicon + brand assets pipeline',
      'Vercel deploy + DNS handoff',
      'Two rounds of revisions',
    ],
    notIncluded: [
      'CMS-backed blog (use Site Starter Pro)',
      'Long-form copywriting (we provide structure + edits)',
      'Custom illustration or video',
    ],
    faq: [
      {
        q: 'How is this different from Ship?',
        a: 'Ship is a heavier 2-week engagement (up to 8 pages, CMS, custom integration). Site Starter Marketing is a tighter 4-page site without CMS — faster and cheaper if you do not need editorial cadence.',
      },
      {
        q: 'Can I add a blog later?',
        a: 'Yes. Upgrade to Site Starter Pro ($3,500) which adds a CMS-backed blog, or move up to Ship.',
      },
      {
        q: 'Do you write copy?',
        a: 'We provide structure, headlines, and edits. Long-form copy is BYO or add $1,200 for written + edited copy across all 4 pages.',
      },
    ],
    phases: [
      {
        label: 'Day 1-2',
        title: 'Discovery',
        description: 'Sitemap, content inventory, wireframes for all 4 pages.',
        artifacts: ['Sitemap', 'Wireframes'],
      },
      {
        label: 'Day 3-6',
        title: 'Build',
        description: 'Page-by-page implementation, daily Vercel previews.',
        artifacts: ['Preview deploys'],
      },
      {
        label: 'Day 7-8',
        title: 'SEO + revisions',
        description: 'Schema, sitemap, OG, two rounds of revisions.',
        artifacts: ['SEO checklist', 'Revised previews'],
      },
      {
        label: 'Day 9-10',
        title: 'Launch',
        description: 'DNS cutover, production deploy, Loom handoff.',
        artifacts: ['Live site', 'Loom walkthrough'],
      },
    ],
    resultMetrics: [
      { value: '7-10 days', label: 'Time to live', context: 'guaranteed' },
      { value: '95+', label: 'Lighthouse SEO', context: 'sitewide' },
      { value: '4', label: 'Pages shipped', context: 'every Marketing tier' },
    ],
    addOns: [
      {
        name: 'Site Care retainer',
        description: 'Monthly upkeep on the new site — patches, copy edits, small tweaks.',
        price: '$300/mo',
      },
      {
        name: 'Long-form copywriting',
        description: 'Up to 3,000 words across all pages, written and edited in your voice.',
        price: '+$1,200',
      },
    ],
    caseStudySlugs: [],
    schemaSummary: 'Four-page marketing site with SEO foundation, delivered in 7-10 business days.',
  },

  // ────────────────────────────────────────────────────────────────────────
  // 13. SITE STARTER — Pro
  // ────────────────────────────────────────────────────────────────────────
  {
    slug: 'site-starter-pro',
    name: 'Site Starter — Pro',
    shortName: 'Pro',
    tagline: '6 pages + CMS-backed blog + SEO foundation, in 2 weeks.',
    description:
      '6 pages plus a CMS-backed blog and SEO foundation. Best for teams who want to publish content from day one. 2 week turnaround. 30 days of post-launch support included.',
    price: '$3,500',
    priceCents: 350_000,
    cadence: 'one-time',
    timeline: '2 weeks',
    cta: 'Get Started',
    ctaHref: '/services/site-starter',
    stripeProductId: 'prod_USqdlUF3QrR0Ei',
    stripePriceId: 'price_1TTuwYCzAAY45QFMkpH8grK2',
    highlight: true,
    capability: 'web',
    mode: 'sprint',
    outcomes: [
      'Live 6-page site with CMS-backed blog',
      'SEO foundation that compounds',
      '30 days of post-launch support included',
      'Two rounds of revisions across 2 weeks',
    ],
    deliverables: [
      'Six pages plus a CMS-backed blog (Sanity or Contentful)',
      'Schema.org Organization, Service, Article, Breadcrumb',
      'Sitemap, robots, canonical, OG configured',
      'Contact form with spam protection',
      'Analytics (Google Analytics or Plausible)',
      'Open Graph + favicon + brand pipeline',
      'Vercel deploy + DNS handoff',
      'Two rounds of revisions',
      '30 days of post-launch support',
    ],
    notIncluded: [
      'Custom integrations beyond CMS + form (use Ship)',
      'Long-form copywriting (we provide structure + edits)',
      'Logo / brand identity (BYO or pair with Brand Sprint)',
    ],
    faq: [
      {
        q: 'How is this different from Ship?',
        a: 'Site Starter Pro is a tighter scope (6 pages, CMS-backed blog, SEO) at a fixed lower price. Ship is up to 8 pages, includes a custom integration, and runs over 2 weeks with 30 days of support. If you need a custom CRM/booking integration, pick Ship.',
      },
      {
        q: 'Which CMS do you use?',
        a: 'Sanity by default (free tier covers most teams). Contentful available on request.',
      },
      {
        q: 'What is included in 30-day support?',
        a: 'Bug fixes, copy edits, small tweaks. Larger feature work rolls into Site Care ($300/mo) or Ship.',
      },
    ],
    phases: [
      {
        label: 'Day 1-3',
        title: 'Discovery',
        description: 'Sitemap, CMS schema design, wireframes, content brief.',
        artifacts: ['Sitemap', 'CMS schema', 'Wireframes'],
      },
      {
        label: 'Day 4-9',
        title: 'Build',
        description: 'Page implementation, blog setup, CMS schemas, daily Vercel previews.',
        artifacts: ['Preview deploys', 'CMS instance'],
      },
      {
        label: 'Day 10-12',
        title: 'SEO + revisions',
        description: 'Schema, structured data, sitemap, OG. Two rounds of revisions.',
        artifacts: ['SEO checklist', 'Revised previews'],
      },
      {
        label: 'Day 13-14',
        title: 'Launch',
        description: 'DNS cutover, production deploy, Loom handoff, training session.',
        artifacts: ['Live site', 'Handoff doc', 'Loom training'],
      },
    ],
    resultMetrics: [
      { value: '14 days', label: 'Time to live', context: 'guaranteed' },
      { value: '95+', label: 'Lighthouse SEO', context: 'sitewide' },
      { value: '30 days', label: 'Post-launch support', context: 'included' },
    ],
    addOns: [
      {
        name: 'Site Care retainer',
        description: 'Monthly upkeep on the new site — patches, copy edits, small tweaks.',
        price: '$300/mo',
      },
      {
        name: 'Long-form copywriting',
        description: 'Up to 5,000 words across pages + 2 launch blog posts.',
        price: '+$1,800',
      },
      {
        name: 'Brand Sprint pairing',
        description: 'Pair with Brand Sprint for a complete identity + site.',
        price: '+$2,000',
      },
    ],
    caseStudySlugs: [],
    schemaSummary: 'Six-page site with CMS-backed blog and SEO foundation, delivered in 2 weeks.',
  },
] as const

export const tiersBySlug = Object.fromEntries(tiers.map((t) => [t.slug, t]))

/** Order tiers want to appear in across pricing/services index/footer. */
export const tierDisplayOrder: string[] = [
  'audit',
  'ship',
  'automate',
  'seo-sprint',
  'content-engine',
  'brand-sprint',
  'scale',
  'build',
  'app-development',
  'operate',
]

/** Tiers in display order. */
export const tiersOrdered: Tier[] = tierDisplayOrder
  .map((slug) => tiersBySlug[slug])
  .filter(Boolean) as Tier[]

/** Capability metadata — drives the /capabilities matrix. */
export type CapabilityKey = Tier['capability']

export const capabilities: Record<
  CapabilityKey,
  { label: string; tagline: string; tierSlugs: string[] }
> = {
  strategy: {
    label: 'Strategy',
    tagline: 'A focused set of eyes on what to build, ship, and stop doing.',
    tierSlugs: ['audit'],
  },
  web: {
    label: 'Web',
    tagline: 'Production marketing sites, fast, indexable, and CMS-backed.',
    tierSlugs: ['ship', 'site-care'],
  },
  automation: {
    label: 'Automation',
    tagline: 'AI-native workflows with monitoring, fallbacks, and runbooks.',
    tierSlugs: ['automate'],
  },
  seo: {
    label: 'SEO',
    tagline: 'Technical SEO + programmatic SEO that compounds.',
    tierSlugs: ['seo-sprint', 'scale'],
  },
  content: {
    label: 'Content',
    tagline: 'Long-form, research-backed, distributed — every week.',
    tierSlugs: ['content-engine', 'content-care'],
  },
  brand: {
    label: 'Brand',
    tagline: 'Verbal + visual identity, ready for production.',
    tierSlugs: ['brand-sprint', 'brand-care'],
  },
  product: {
    label: 'Product',
    tagline: 'Site + app + automation + SEO under one engagement.',
    tierSlugs: ['build'],
  },
  platform: {
    label: 'Platform',
    tagline: 'Engineering ownership on retainer for one critical surface area.',
    tierSlugs: ['operate'],
  },
  app: {
    label: 'Apps',
    tagline: 'Purpose-built web apps for small teams — spec, prototype, build, launch.',
    tierSlugs: ['app-development'],
  },
}

/* ============================================================================
 * Capability × Mode matrix — every cell filled
 *
 * Some cells map to a productized tier (Sage Audit, Ship, etc.) with Stripe
 * checkout. Others are “custom” engagements with a transparent floor price
 * and a “Talk to Sage” CTA. A small set of “Care” retainers (Site Care,
 * Brand Care, Content Care) live as standalone Stripe products too.
 * ===========================================================================
 */

export type Mode = 'audit' | 'sprint' | 'build' | 'operate'

export type MatrixCellKind = 'tier' | 'care' | 'custom'

export type MatrixCell = {
  /** A tier slug (‘audit’, ‘ship’, etc.) when kind=tier. Otherwise a stable id. */
  id: string
  kind: MatrixCellKind
  /** Short label for the matrix cell. */
  label: string
  /** Display price string (‘$750’, ‘from $1,200’, ‘$300/mo’). */
  price: string
  /** Short delivery / engagement timeline. */
  timeline: string
  /** Where the cell links to (service page, checkout, or contact). */
  href: string
  /** Optional one-liner used in tooltip / mobile expanded card. */
  description?: string
  /** True for the existing 9 productized tiers (highlight color). */
  productized?: boolean
  /** Stripe price + product id when applicable (Care retainers). */
  stripeProductId?: string
  stripePriceId?: string
}

export type CareTier = {
  slug: string
  name: string
  shortName: string
  tagline: string
  description: string
  price: string
  priceCents: number
  cadence: 'monthly'
  stripeProductId: string
  stripePriceId: string
  capability: CapabilityKey
  outcomes: string[]
  ctaHref: string
}

/** Lightweight monthly retainers that complement the productized tiers. */
export const careTiers: CareTier[] = [
  {
    slug: 'site-care',
    name: 'Site Care',
    shortName: 'Site Care',
    tagline: 'Monthly site upkeep — patches, copy edits, perf tuning.',
    description:
      'A lightweight monthly retainer for an existing site. Uptime monitoring, security patches, copy edits, performance tuning, content updates, and small feature tweaks. Cancel anytime.',
    price: '$300',
    priceCents: 30_000,
    cadence: 'monthly',
    stripeProductId: 'prod_URylIJqZtFVUl5',
    stripePriceId: 'price_1TT4o0EDeyGfkojJH0Ose7UB',
    capability: 'web',
    outcomes: [
      'Uptime + security patching',
      'Copy edits and content updates',
      'Performance tuning + Lighthouse upkeep',
      'Small feature tweaks each month',
    ],
    ctaHref: '/checkout/site-care',
  },
  {
    slug: 'brand-care',
    name: 'Brand Care',
    shortName: 'Brand Care',
    tagline: 'Monthly brand maintenance — logo updates, social, guideline upkeep.',
    description:
      'Ongoing brand maintenance retainer for teams who shipped Brand Sprint or already have an identity in place. Logo refreshes, social asset templates, brand guideline upkeep, and small-batch design requests. Cancel anytime.',
    price: '$400',
    priceCents: 40_000,
    cadence: 'monthly',
    stripeProductId: 'prod_URylEiF1dSdmOc',
    stripePriceId: 'price_1TT4o0EDeyGfkojJuXE37BDs',
    capability: 'brand',
    outcomes: [
      'Asset library upkeep + new template requests',
      'Brand guideline edits as the company evolves',
      'Small-batch social / sales / event design',
      'Quarterly brand health review',
    ],
    ctaHref: '/checkout/brand-care',
  },
  {
    slug: 'content-care',
    name: 'Content Care',
    shortName: 'Content Care',
    tagline: 'Monthly content maintenance — refreshes, internal linking, repurposing.',
    description:
      'A lighter alternative to Content Engine. Refresh existing posts, tighten internal linking, light editing, social repurposing, and analytics check-ins. Designed for teams who already publish but want a steady hand on quality. Cancel anytime.',
    price: '$800',
    priceCents: 80_000,
    cadence: 'monthly',
    stripeProductId: 'prod_URylShYqQm6kyO',
    stripePriceId: 'price_1TT4o0EDeyGfkojJNEKyCk1L',
    capability: 'content',
    outcomes: [
      'Existing-post refreshes (every month)',
      'Internal linking + cluster strengthening',
      'Light social + newsletter repurposing',
      'Monthly analytics + topic suggestions',
    ],
    ctaHref: '/checkout/content-care',
  },
]

export const careTiersBySlug = Object.fromEntries(
  careTiers.map((c) => [c.slug, c])
)

/** Builds a fully populated 8 × 4 matrix — every cell has a real offering. */
export const capabilityMatrix: Record<
  CapabilityKey,
  Record<Mode, MatrixCell>
> = {
  strategy: {
    audit: {
      id: 'audit',
      kind: 'tier',
      label: 'Sage Audit',
      price: '$750',
      timeline: '5 business days',
      href: '/services/audit',
      productized: true,
    },
    sprint: {
      id: 'strategy-sprint',
      kind: 'custom',
      label: 'Strategy Sprint',
      price: 'from $1,200',
      timeline: '2–3 weeks',
      href: '/contact?engagement=strategy-sprint',
      description:
        'A short, focused engagement to translate audit findings into a roadmap or to scope a single critical decision. Custom-priced.',
    },
    build: {
      id: 'roadmap-build',
      kind: 'custom',
      label: 'Roadmap Build',
      price: 'from $4,500',
      timeline: '4–6 weeks',
      href: '/contact?engagement=roadmap-build',
      description:
        'A full strategic roadmap: target customer, positioning, technical bets, build/buy/partner calls, hiring plan. Custom-priced.',
    },
    operate: {
      id: 'fractional-strategy',
      kind: 'custom',
      label: 'Fractional Strategy',
      price: 'from $1,500/mo',
      timeline: 'Quarterly minimum',
      href: '/contact?engagement=fractional-strategy',
      description:
        'Monthly advisory retainer for founder/CEO-level decisions. Async + scheduled syncs. Custom-priced.',
    },
  },
  web: {
    audit: {
      id: 'web-audit',
      kind: 'custom',
      label: 'Web Audit',
      price: 'from $500',
      timeline: '5 business days',
      href: '/contact?engagement=web-audit',
      description:
        'Slimmer audit focused only on a marketing site or web app. Lighthouse, accessibility, SEO foundations, conversion review.',
    },
    sprint: {
      id: 'ship',
      kind: 'tier',
      label: 'Ship',
      price: '$2,500',
      timeline: '2 weeks',
      href: '/services/ship',
      productized: true,
    },
    build: {
      id: 'web-build-custom',
      kind: 'custom',
      label: 'Custom Web Build',
      price: 'from $5,000',
      timeline: '3–6 weeks',
      href: '/contact?engagement=custom-web-build',
      description:
        'When Ship is too small — multi-page builds, custom CMS workflows, complex integrations, e-commerce flows. Custom-priced.',
    },
    operate: {
      id: 'site-care',
      kind: 'care',
      label: 'Site Care',
      price: '$300/mo',
      timeline: 'Cancel anytime',
      href: '/services/site-care',
      stripeProductId: 'prod_URylIJqZtFVUl5',
      stripePriceId: 'price_1TT4o0EDeyGfkojJH0Ose7UB',
      description:
        'Ongoing site upkeep retainer — patches, copy edits, perf tuning, small feature tweaks.',
    },
  },
  automation: {
    audit: {
      id: 'automation-audit',
      kind: 'custom',
      label: 'Automation Audit',
      price: 'from $900',
      timeline: '5 business days',
      href: '/contact?engagement=automation-audit',
      description:
        'Map a workflow end-to-end, identify the biggest leverage points, and produce a build-ready spec.',
    },
    sprint: {
      id: 'automate',
      kind: 'tier',
      label: 'Automate',
      price: '$3,500',
      timeline: '3 weeks',
      href: '/services/automate',
      productized: true,
    },
    build: {
      id: 'automation-build',
      kind: 'custom',
      label: 'Automation Build',
      price: 'from $5,500',
      timeline: '4–6 weeks',
      href: '/contact?engagement=automation-build',
      description:
        'Multi-workflow automation system with monitoring, fallbacks, observability, and a runbook.',
    },
    operate: {
      id: 'automation-operate',
      kind: 'custom',
      label: 'Automation Care',
      price: 'from $400/mo',
      timeline: 'Cancel anytime',
      href: '/contact?engagement=automation-care',
      description:
        'Monthly care for shipped automations — monitoring, prompt updates, model refreshes, runbook updates.',
    },
  },
  seo: {
    audit: {
      id: 'seo-audit',
      kind: 'custom',
      label: 'SEO Audit',
      price: 'from $500',
      timeline: '5 business days',
      href: '/contact?engagement=seo-audit',
      description:
        'A focused, standalone SEO audit — crawl health, schema, vitals, on-page — without the full sprint.',
    },
    sprint: {
      id: 'seo-sprint',
      kind: 'tier',
      label: 'SEO Sprint',
      price: '$1,500',
      timeline: '30 days',
      href: '/services/seo-sprint',
      productized: true,
    },
    build: {
      id: 'programmatic-seo-build',
      kind: 'custom',
      label: 'Programmatic SEO Build',
      price: 'from $4,500',
      timeline: '4–6 weeks',
      href: '/contact?engagement=programmatic-seo-build',
      description:
        'Build out programmatic SEO at scale — templates, data ingestion, internal linking, schema, reporting.',
    },
    operate: {
      id: 'scale',
      kind: 'tier',
      label: 'Scale',
      price: '$1,200/mo',
      timeline: 'Quarterly minimum',
      href: '/services/scale',
      productized: true,
    },
  },
  content: {
    audit: {
      id: 'content-audit',
      kind: 'custom',
      label: 'Content Audit',
      price: 'from $500',
      timeline: '5 business days',
      href: '/contact?engagement=content-audit',
      description:
        'Review your existing content, topic coverage, and editorial process. Output: a 90-day plan.',
    },
    sprint: {
      id: 'content-sprint',
      kind: 'custom',
      label: 'Content Sprint',
      price: 'from $1,200',
      timeline: '2 weeks',
      href: '/contact?engagement=content-sprint',
      description:
        'A short editorial sprint — 4 long-form pieces shipped without a long-term commitment.',
    },
    build: {
      id: 'editorial-build',
      kind: 'custom',
      label: 'Editorial System Build',
      price: 'from $4,500',
      timeline: '4–6 weeks',
      href: '/contact?engagement=editorial-build',
      description:
        'Stand up an end-to-end editorial system — CMS, workflow, distribution, analytics, on-brand templates.',
    },
    operate: {
      id: 'content-engine',
      kind: 'tier',
      label: 'Content Engine',
      price: '$1,500/mo',
      timeline: 'Quarterly minimum',
      href: '/services/content-engine',
      productized: true,
    },
  },
  brand: {
    audit: {
      id: 'brand-audit',
      kind: 'custom',
      label: 'Brand Audit',
      price: 'from $500',
      timeline: '5 business days',
      href: '/contact?engagement=brand-audit',
      description:
        'Audit your existing brand — verbal, visual, applied. Output: a fix list and risk assessment.',
    },
    sprint: {
      id: 'brand-sprint',
      kind: 'tier',
      label: 'Brand Sprint',
      price: '$2,500',
      timeline: '2 weeks',
      href: '/services/brand-sprint',
      productized: true,
    },
    build: {
      id: 'brand-build-full',
      kind: 'custom',
      label: 'Full Brand Build',
      price: 'from $4,500',
      timeline: '4–6 weeks',
      href: '/contact?engagement=brand-build',
      description:
        'Verbal + visual + applied identity, plus a launch site, deck, and asset library.',
    },
    operate: {
      id: 'brand-care',
      kind: 'care',
      label: 'Brand Care',
      price: '$400/mo',
      timeline: 'Cancel anytime',
      href: '/services/brand-care',
      stripeProductId: 'prod_URylEiF1dSdmOc',
      stripePriceId: 'price_1TT4o0EDeyGfkojJuXE37BDs',
      description:
        'Monthly brand maintenance retainer — logo updates, social asset refreshes, guideline upkeep.',
    },
  },
  product: {
    audit: {
      id: 'product-audit',
      kind: 'custom',
      label: 'Product Audit',
      price: 'from $1,000',
      timeline: '5 business days',
      href: '/contact?engagement=product-audit',
      description:
        'Audit a SaaS or product — architecture, growth instrumentation, billing, onboarding, and tech debt.',
    },
    sprint: {
      id: 'product-sprint',
      kind: 'custom',
      label: 'Product Sprint',
      price: 'from $4,500',
      timeline: '3–4 weeks',
      href: '/contact?engagement=product-sprint',
      description:
        'A focused sprint — ship one new product surface, fix one critical workflow, or run a focused redesign.',
    },
    build: {
      id: 'build',
      kind: 'tier',
      label: 'Build',
      price: 'from $9,500',
      timeline: '4–12 weeks',
      href: '/services/build',
      productized: true,
    },
    operate: {
      id: 'product-care',
      kind: 'custom',
      label: 'Product Care',
      price: 'from $1,500/mo',
      timeline: 'Quarterly minimum',
      href: '/contact?engagement=product-care',
      description:
        'Ongoing product retainer — feature work, bug triage, growth experiments, billing changes.',
    },
  },
  platform: {
    audit: {
      id: 'platform-audit',
      kind: 'custom',
      label: 'Platform Audit',
      price: 'from $900',
      timeline: '5 business days',
      href: '/contact?engagement=platform-audit',
      description:
        'Cloud architecture review — IAM, networking, IaC quality, cost, observability, security posture.',
    },
    sprint: {
      id: 'platform-sprint',
      kind: 'custom',
      label: 'Platform Sprint',
      price: 'from $3,500',
      timeline: '3 weeks',
      href: '/contact?engagement=platform-sprint',
      description:
        'Targeted platform work — stand up a landing zone, fix observability, ship CI/CD overhauls.',
    },
    build: {
      id: 'platform-build',
      kind: 'custom',
      label: 'Platform Build',
      price: 'from $6,500',
      timeline: '4–8 weeks',
      href: '/contact?engagement=platform-build',
      description:
        'Greenfield platform engineering — multi-account AWS, IaC, observability, runbooks, on-call setup.',
    },
    operate: {
      id: 'operate',
      kind: 'tier',
      label: 'Operate',
      price: '$2,500/mo',
      timeline: 'Quarterly minimum',
      href: '/services/operate',
      productized: true,
    },
  },
  app: {
    audit: {
      id: 'app-audit',
      kind: 'custom',
      label: 'App Audit',
      price: 'from $900',
      timeline: '5 business days',
      href: '/contact?engagement=app-audit',
      description:
        'Codebase, UX, perf, accessibility, and security review of an existing web app — with a prioritized fix list.',
    },
    sprint: {
      id: 'app-prototype',
      kind: 'custom',
      label: 'App Prototype Sprint',
      price: 'from $2,500',
      timeline: '2–3 weeks',
      href: '/contact?engagement=app-prototype',
      description:
        'A focused prototype that proves the riskiest flow before committing to a full build. Custom-priced.',
    },
    build: {
      id: 'app-development',
      kind: 'tier',
      label: 'App Development',
      price: 'from $6,500',
      timeline: '4–10 weeks',
      href: '/services/app-development',
      productized: true,
    },
    operate: {
      id: 'app-operate',
      kind: 'custom',
      label: 'App Operate',
      price: 'from $2,500/mo',
      timeline: 'Quarterly minimum',
      href: '/contact?engagement=app-operate',
      description:
        'Ongoing ownership of a small-team web app — features, bugs, deps, monitoring, on-call.',
    },
  },
}

/** Capability metadata in stable display order. */
export const capabilityOrder: CapabilityKey[] = [
  'strategy',
  'web',
  'automation',
  'seo',
  'content',
  'brand',
  'product',
  'app',
  'platform',
]

/** Mode metadata in stable display order with display labels + taglines. */
export const modeMeta: { key: Mode; label: string; tagline: string }[] = [
  { key: 'audit', label: 'Audit', tagline: 'Focused eyes on what to fix.' },
  { key: 'sprint', label: 'Sprint', tagline: 'Fixed-scope, fixed-price ship.' },
  { key: 'build', label: 'Build', tagline: 'Custom, multi-week engagement.' },
  { key: 'operate', label: 'Operate', tagline: 'Engineering ownership, on retainer.' },
]

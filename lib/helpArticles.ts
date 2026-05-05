export type HelpCategory =
  | 'getting-started'
  | 'documents'
  | 'invoices'
  | 'messaging'
  | 'calendar';

export type HelpArticle = {
  slug: string;
  title: string;
  category: HelpCategory;
  intro: string;
  steps: string[];
  notes?: string;
};

export const HELP_CATEGORIES: { id: HelpCategory; label: string; description: string }[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'Find your way around the portal and set up your account.',
  },
  {
    id: 'documents',
    label: 'Documents & Contracts',
    description: 'Review, sign, and download contracts and proposals.',
  },
  {
    id: 'invoices',
    label: 'Invoices & Payments',
    description: 'Pay invoices, see receipts, and manage subscriptions.',
  },
  {
    id: 'messaging',
    label: 'Messaging',
    description: 'Talk to your team in real time inside an engagement.',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Track upcoming meetings and accept invites.',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'welcome',
    title: 'Welcome to your Sage Ideas portal',
    category: 'getting-started',
    intro:
      'Your portal is the single place to track every engagement with Sage Ideas: documents, invoices, status reports, and direct messages. Here is what each tab does.',
    steps: [
      'Dashboard — a snapshot of active engagements, the next invoice due, and any pending actions.',
      'Projects — every engagement you have with us, current status, and the latest status report.',
      'Messages — real-time chat with the project team, scoped per engagement.',
      'Inbox — every notification we have ever sent you, read or unread.',
      'Calendar — upcoming meetings and review sessions.',
      'Documents — proposals, contracts, NDAs, and signed PDFs.',
      'Invoices — open and paid invoices, with one-click pay buttons.',
      'Settings — your profile, avatar, and notification preferences.',
      'Add Services — browse the catalog and start a new engagement on your own.',
    ],
    notes:
      'Your access is scoped to your organization. You can only see engagements your team is a member of.',
  },
  {
    slug: 'sign-a-contract',
    title: 'How to sign a contract',
    category: 'documents',
    intro:
      'Once we send a contract for signature, you receive an email with a private link. You can also sign from inside the portal.',
    steps: [
      'Open the email titled "Contract ready to sign — Sage Ideas" or go to the Documents tab in the portal.',
      'Click the contract row to open the full document. Scroll through to review all sections.',
      'When you reach the bottom, type your full legal name in the signature field.',
      'Draw or type your signature in the signature pad.',
      'Click Sign and confirm. The signed PDF is generated immediately.',
      'You and Sage both receive a confirmation email with the countersigned PDF attached.',
    ],
    notes:
      'Signing links expire after 14 days. If yours has lapsed, email sage@sageideas.dev and we will send a fresh one.',
  },
  {
    slug: 'pay-an-invoice',
    title: 'How to pay an invoice',
    category: 'invoices',
    intro:
      'Invoices are payable directly from the portal via Stripe. Most cards and ACH debits are supported.',
    steps: [
      'Open the Invoices tab.',
      'Click the invoice you want to pay. Review the line items, totals, and due date.',
      'Click the Pay button. You will be redirected to Stripe Checkout.',
      'Enter your payment details on Stripe and confirm.',
      'On success Stripe redirects you back to the portal and the invoice flips to Paid within a few seconds.',
      'A receipt email arrives from Stripe with the invoice attached as a PDF.',
    ],
    notes:
      'For wire or ACH outside Stripe, reply to your invoice email and we will share routing details.',
  },
  {
    slug: 'message-your-team',
    title: 'How to message your team',
    category: 'messaging',
    intro:
      'Messaging is real-time and scoped per engagement, so conversations stay tied to the right project.',
    steps: [
      'Open the Messages tab.',
      'Pick the engagement you want to discuss from the left rail.',
      'Type your message in the composer and press Enter (Shift+Enter for a new line).',
      'New messages from the team appear instantly without refreshing.',
      'You will receive an email and an in-app notification when someone replies if the tab is closed.',
    ],
    notes:
      'For sensitive items (credentials, secrets), use the Documents upload instead of the chat.',
  },
  {
    slug: 'view-project-status',
    title: 'How to view your project status',
    category: 'getting-started',
    intro:
      'Every active engagement gets a weekly status report from the team. You can read past reports and request a fresh one any time.',
    steps: [
      'Open the Projects tab.',
      'Click into a project to see its detail page.',
      'Scroll to Status reports. Each report shows the date, progress summary, and next steps.',
      'To request an out-of-cycle update, click Request status update. The team is notified by email and inbox.',
      'You can subscribe to weekly digest emails in Settings if you want them in your inbox automatically.',
    ],
  },
  {
    slug: 'update-profile',
    title: 'How to update your profile',
    category: 'getting-started',
    intro:
      'Keep your profile up to date so notifications, signatures, and reports show the right name.',
    steps: [
      'Open the Settings tab.',
      'Edit your display name. Changes save when you click Save profile.',
      'Click Upload to set a new avatar (PNG or JPG, up to 2 MB).',
      'Under Notification preferences, toggle email categories on or off and pick a digest frequency: daily, weekly, or off.',
      'Click Save preferences. The change takes effect on the next outgoing notification.',
    ],
  },
  {
    slug: 'view-calendar',
    title: 'How to view your calendar',
    category: 'calendar',
    intro:
      'The Calendar tab pulls every meeting we have on your engagements into one timeline.',
    steps: [
      'Open the Calendar tab.',
      'The default view is the next two weeks. Use the date picker to jump forward or back.',
      'Click an event to see attendees, meeting agenda, and join link.',
      'Click Accept or Decline to RSVP. The team is notified immediately.',
      'You can also subscribe to the calendar via the iCal link at the bottom of the page to mirror events into Google Calendar or Apple Calendar.',
    ],
  },
  {
    slug: 'faq',
    title: 'Frequently asked questions',
    category: 'getting-started',
    intro:
      'Quick answers to the most common questions we get from clients. If yours is not here, email sage@sageideas.dev.',
    steps: [
      'When do I get billed? — Fixed-fee engagements bill on signing and at agreed milestones. Subscription services bill monthly on the day of the month you signed up. You always see the next billing date in the Invoices tab.',
      'What file types can I upload? — PDF, PNG, JPG, MP4, MOV, ZIP, plus standard office docs (DOCX, XLSX, CSV, MD). Max file size is 50 MB.',
      'How do I add a team member? — Email sage@sageideas.dev with the person\'s email and the role they should have. They will get an invite the same day.',
      'How do I cancel a subscription? — Open the Invoices tab, find the subscription, and click Cancel. The subscription stays active until the end of the current period and then closes automatically. Reach out if you need to cancel mid-cycle.',
      'Can I export my data? — Yes. Email sage@sageideas.dev and we will export contracts, invoices, and messages as a zip within one business day.',
    ],
  },
];

export function getArticleBySlug(slug: string): HelpArticle | null {
  return HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}

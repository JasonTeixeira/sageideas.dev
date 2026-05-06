import {
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  escapeHtml,
} from '@/components/email/_layout';

export type AuthEmailKind =
  | 'signup'
  | 'recovery'
  | 'magiclink'
  | 'invite'
  | 'email_change_current'
  | 'email_change_new'
  | 'reauthentication';

type Copy = {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
  secondary?: string;
};

const COPY: Record<AuthEmailKind, Copy> = {
  signup: {
    subject: 'Confirm your email',
    heading: 'Welcome to Sage Ideas',
    intro:
      "We're glad you're here. Confirm your email to finish setting up your studio account — it only takes a second.",
    cta: 'Confirm email',
    secondary:
      "Once you confirm, we'll review your account so you can land directly in the portal next time you sign in.",
  },
  recovery: {
    subject: 'Reset your password',
    heading: 'Password reset request',
    intro:
      "We received a request to reset the password on your Sage Ideas account. Click below to choose a new one — the link is valid for one hour.",
    cta: 'Reset password',
  },
  magiclink: {
    subject: 'Your sign-in link',
    heading: 'Sign in to Sage Ideas',
    intro:
      "Tap the button below to sign in. The link is single-use and expires shortly, so use it from the same device when you can.",
    cta: 'Sign in',
  },
  invite: {
    subject: "You're invited to Sage Ideas",
    heading: "You've been invited",
    intro:
      "Sage has set up a workspace for you in the studio. Accept your invite to set a password and meet your engagement.",
    cta: 'Accept invite',
    secondary:
      "Your portal includes deliverables, signed contracts, invoices, and a direct line to Sage.",
  },
  email_change_current: {
    subject: 'Confirm email change',
    heading: 'Confirm your new email',
    intro:
      "Someone (hopefully you) requested a change to the email on your Sage Ideas account. Confirm from this address to allow the change.",
    cta: 'Confirm change',
  },
  email_change_new: {
    subject: 'Confirm email change',
    heading: 'Confirm your new email',
    intro:
      "You're nearly done — confirm this is your new email address for your Sage Ideas account.",
    cta: 'Confirm change',
  },
  reauthentication: {
    subject: "Verify it's you",
    heading: 'Confirm your identity',
    intro:
      "We need to verify it's you before completing this sensitive action on your Sage Ideas account.",
    cta: 'Verify',
  },
};

function copyFor(kind: string): Copy {
  if ((COPY as Record<string, Copy>)[kind]) {
    return (COPY as Record<string, Copy>)[kind];
  }
  return {
    subject: 'Confirm your request',
    heading: 'Action required',
    intro: 'Please confirm this request from your Sage Ideas account.',
    cta: 'Continue',
  };
}

export function renderAuthEmailHtml(input: {
  recipient: string;
  kind: AuthEmailKind | string;
  url: string;
  fullName?: string;
}): { subject: string; html: string; text: string } {
  const copy = copyFor(input.kind);
  const greeting = input.fullName ? `Hi ${input.fullName.split(' ')[0]} — ` : '';
  const introHtml = `${escapeHtml(greeting)}${escapeHtml(copy.intro)}`;
  const secondaryHtml = copy.secondary ? renderParagraph(escapeHtml(copy.secondary)) : '';
  const safety = renderParagraph(
    `<span style="color:#71717A;font-size:13px;">If you didn't request this, you can safely ignore this email — nothing will change on your account.</span>`,
  );

  const body = [
    renderHeading(copy.heading),
    renderParagraph(introHtml),
    renderButton(copy.cta, input.url),
    secondaryHtml,
    safety,
    renderParagraph(
      `<span style="color:#52525B;font-size:12px;">If the button doesn't work, paste this URL into your browser:<br/><span style="color:#71717A;word-break:break-all;">${escapeHtml(input.url)}</span></span>`,
    ),
  ].join('\n');

  const html = renderLayout({
    recipient: input.recipient,
    title: copy.subject,
    preheader: copy.intro,
    bodyHtml: body,
  });

  const text = [
    `${greeting}${copy.intro}`,
    '',
    `${copy.cta}: ${input.url}`,
    '',
    copy.secondary ?? '',
    '',
    "If you didn't request this, you can safely ignore this email.",
    '',
    '— Sage Ideas Studio',
    'sage@sageideas.dev · https://www.sageideas.dev',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject: copy.subject, html, text };
}

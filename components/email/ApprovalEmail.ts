import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
} from './_layout';

export type ApprovalEmailProps = { to: string; fullName?: string };

export function renderApprovalEmail({ to, fullName }: ApprovalEmailProps) {
  const greeting = fullName ? `Hi ${escapeHtml(fullName)}` : 'Hi';
  const body = `
${renderHeading("You're in. Welcome to Sage Ideas Studio.")}
${renderParagraph(`${greeting} &mdash; your workspace is live. You can sign in now and start operating.`)}
${renderParagraph('Inside, you will find: project status, deliverables awaiting your decision, contracts and signatures, invoices, calendar, and direct messaging with Sage.')}
${renderButton('Open your portal', `${SITE}/portal`)}
${renderParagraph('Reply to this email if anything is missing or off &mdash; short, specific feedback wins.')}
`;
  const text = `${fullName ? `Hi ${fullName}` : 'Hi'} - your Sage Ideas Studio workspace is live. Sign in at ${SITE}/portal to get started.\n\nReply to this email if anything is missing.\n\n- Sage`;
  return {
    subject: "You're in. Welcome to Sage Ideas Studio.",
    html: renderLayout({ recipient: to, title: 'Welcome to Sage Ideas Studio', preheader: 'Your workspace is live.', bodyHtml: body }),
    text,
  };
}

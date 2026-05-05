import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
} from './_layout';

export type MagicLinkEmailProps = { to: string; magicUrl: string };

export function renderMagicLinkEmail({ to, magicUrl }: MagicLinkEmailProps) {
  const body = `
${renderHeading('Your sign-in link')}
${renderParagraph('Click the button below to sign in. The link is good for one use and expires shortly.')}
${renderButton('Sign in', magicUrl)}
${renderParagraph(`If the button does not work, copy and paste this URL: <span style="color:#D4D4D8;word-break:break-all;">${escapeHtml(magicUrl)}</span>`)}
${renderParagraph('Did not request this? Ignore the email &mdash; nothing will happen.')}
`;
  const text = `Your Sage Ideas sign-in link:\n\n${magicUrl}\n\nIf you didn't request this, ignore this email.`;
  return {
    subject: 'Your Sage Ideas sign-in link',
    html: renderLayout({ recipient: to, title: 'Your sign-in link', preheader: 'One-time link to access your workspace.', bodyHtml: body }),
    text,
  };
}

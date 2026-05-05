import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type MessageNotificationEmailProps = {
  to: string;
  fullName?: string;
  projectTitle: string;
  senderName: string;
  preview: string;
  threadUrl: string;
};

export function renderMessageNotificationEmail(p: MessageNotificationEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const preview = p.preview.length > 240 ? p.preview.slice(0, 240) + '...' : p.preview;
  const body = `
${renderHeading(`New message in ${escapeHtml(p.projectTitle)}`)}
${renderParagraph(`${greeting} &mdash; ${escapeHtml(p.senderName)} just posted in your project thread.`)}
${renderCallout(escapeHtml(p.senderName), `<div style="color:#D4D4D8;font-style:italic;">${escapeHtml(preview)}</div>`)}
${renderButton('Reply in portal', p.threadUrl)}
${renderParagraph('Mute project messages anytime in your <a href="https://www.sageideas.dev/portal/settings" style="color:#06B6D4;text-decoration:underline;">notification preferences</a>.')}
`;
  const text = `New message in ${p.projectTitle} from ${p.senderName}:\n\n"${preview}"\n\nReply: ${p.threadUrl}`;
  return {
    subject: `New message in ${p.projectTitle}`,
    html: renderLayout({ recipient: p.to, title: 'New project message', preheader: `${p.senderName}: ${preview.slice(0, 80)}`, bodyHtml: body }),
    text,
  };
}

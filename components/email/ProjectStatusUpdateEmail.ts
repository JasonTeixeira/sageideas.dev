import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type ProjectStatusUpdateEmailProps = {
  to: string;
  fullName?: string;
  projectTitle: string;
  summary: string;
  statusLabel?: string;
  detailsUrl: string;
};

export function renderProjectStatusUpdateEmail(p: ProjectStatusUpdateEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const summary = p.summary.length > 600 ? p.summary.slice(0, 600) + '...' : p.summary;
  const body = `
${renderHeading(`Status update &mdash; ${escapeHtml(p.projectTitle)}`)}
${renderParagraph(`${greeting} &mdash; fresh status posted on your project. ${p.statusLabel ? `Current status: <strong style="color:#FAFAFA;">${escapeHtml(p.statusLabel)}</strong>.` : ''}`)}
${renderCallout('Update', `<div style="color:#D4D4D8;white-space:pre-wrap;">${escapeHtml(summary)}</div>`)}
${renderButton('See full update', p.detailsUrl)}
${renderParagraph('Questions or pushback go straight to the thread &mdash; no diplomatic phrasing required.')}
`;
  const text = `Status update - ${p.projectTitle}\n\n${p.statusLabel ? `Status: ${p.statusLabel}\n\n` : ''}${summary}\n\nDetails: ${p.detailsUrl}`;
  return {
    subject: `${p.projectTitle} - status update`,
    html: renderLayout({ recipient: p.to, title: 'Project status update', preheader: summary.slice(0, 100), bodyHtml: body }),
    text,
  };
}

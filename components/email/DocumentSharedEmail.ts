import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type DocumentSharedEmailProps = {
  to: string;
  fullName?: string;
  documentTitle: string;
  organizationName?: string;
  description?: string | null;
  portalUrl: string;
};

export function renderDocumentSharedEmail(p: DocumentSharedEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const orgLine = p.organizationName ? ` for ${escapeHtml(p.organizationName)}` : '';
  const desc = p.description?.trim()
    ? renderCallout('Note from Sage', escapeHtml(p.description))
    : '';

  const body = `
${renderHeading(`A document was shared with you: ${escapeHtml(p.documentTitle)}`)}
${renderParagraph(`${greeting} &mdash; we just shared <strong style="color:#FAFAFA;">${escapeHtml(p.documentTitle)}</strong>${orgLine} in your portal.`)}
${desc}
${renderButton('Open document', p.portalUrl)}
${renderParagraph(`You can view, download, or reply directly from your <a href="${SITE}/portal/documents" style="color:#06B6D4;text-decoration:underline;">documents</a> in the Sage Ideas portal.`)}
`;

  const text = `A document was shared with you: ${p.documentTitle}\n\nOpen it: ${p.portalUrl}${p.description ? `\n\nNote: ${p.description}` : ''}`;

  return {
    subject: `Document shared: ${p.documentTitle}`,
    html: renderLayout({
      recipient: p.to,
      title: 'Document shared',
      preheader: `${p.documentTitle} is ready in your portal`,
      bodyHtml: body,
    }),
    text,
  };
}

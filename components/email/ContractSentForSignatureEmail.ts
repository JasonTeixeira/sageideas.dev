import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type ContractSentEmailProps = {
  to: string;
  fullName?: string;
  documentTitle: string;
  signUrl: string;
  expiresAt?: string;
};

export function renderContractSentForSignatureEmail(p: ContractSentEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const expiresLine = p.expiresAt ? `Link expires ${escapeHtml(p.expiresAt)}.` : 'Link is one-use.';
  const body = `
${renderHeading('Sage sent you a contract to sign')}
${renderParagraph(`${greeting} &mdash; the contract for "${escapeHtml(p.documentTitle)}" is ready to sign. Read it, then sign at the bottom. Takes about two minutes.`)}
${renderCallout('Document', `<div><strong style="color:#FAFAFA;">${escapeHtml(p.documentTitle)}</strong></div><div style="color:#71717A;font-size:12px;margin-top:4px;">${expiresLine}</div>`)}
${renderButton('Review and sign', p.signUrl)}
${renderParagraph('Got concerns about a clause? Reply directly and we will redline before you sign &mdash; easier than amending later.')}
`;
  const text = `Contract for "${p.documentTitle}" is ready to sign.\n\nReview and sign: ${p.signUrl}\n\n${expiresLine}\n\nReply with any concerns before signing.\n\n- Sage`;
  return {
    subject: `Sage sent you a contract to sign: ${p.documentTitle}`,
    html: renderLayout({ recipient: p.to, title: 'Contract ready to sign', preheader: `Review and sign "${p.documentTitle}".`, bodyHtml: body }),
    text,
  };
}

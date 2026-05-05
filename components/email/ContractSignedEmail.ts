import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type ContractSignedEmailProps = {
  to: string;
  fullName?: string;
  documentTitle: string;
  signedAt: string;
  signerName: string;
  signerEmail: string;
  ipAddress?: string;
  pdfUrl?: string;
};

export function renderContractSignedEmail(p: ContractSignedEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const body = `
${renderHeading('Contract signed and recorded')}
${renderParagraph(`${greeting} &mdash; "${escapeHtml(p.documentTitle)}" was signed on ${escapeHtml(p.signedAt)}. Receipt below.`)}
${renderCallout('Signature receipt', `
<div>Document: <strong style="color:#FAFAFA;">${escapeHtml(p.documentTitle)}</strong></div>
<div>Signer: <strong style="color:#FAFAFA;">${escapeHtml(p.signerName)}</strong> (${escapeHtml(p.signerEmail)})</div>
<div>Signed at: <strong style="color:#FAFAFA;">${escapeHtml(p.signedAt)}</strong></div>
${p.ipAddress ? `<div>IP: <span style="color:#A1A1AA;">${escapeHtml(p.ipAddress)}</span></div>` : ''}
`)}
${p.pdfUrl ? renderButton('Download signed PDF', p.pdfUrl) : renderButton('Open documents', `${SITE}/portal/documents`)}
${renderParagraph('Keep this email &mdash; it is your audit trail.')}
`;
  const text = `Contract signed: ${p.documentTitle}\n\nSigner: ${p.signerName} (${p.signerEmail})\nSigned at: ${p.signedAt}${p.ipAddress ? `\nIP: ${p.ipAddress}` : ''}\n${p.pdfUrl ? `PDF: ${p.pdfUrl}` : `Documents: ${SITE}/portal/documents`}\n\nKeep this email for your records.\n\n- Sage`;
  return {
    subject: `Signed: ${p.documentTitle}`,
    html: renderLayout({ recipient: p.to, title: 'Contract signed', preheader: 'Signature receipt enclosed.', bodyHtml: body }),
    text,
  };
}

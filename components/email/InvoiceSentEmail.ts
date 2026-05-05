import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type InvoiceSentEmailProps = {
  to: string;
  fullName?: string;
  invoiceNumber: string;
  amountFormatted: string;
  dueDate?: string;
  payUrl: string;
  pdfUrl?: string;
};

export function renderInvoiceSentEmail(p: InvoiceSentEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const dueLine = p.dueDate ? `Due ${escapeHtml(p.dueDate)}.` : '';
  const pdfLine = p.pdfUrl
    ? `<a href="${p.pdfUrl}" style="color:#06B6D4;text-decoration:underline;">Download PDF</a>`
    : '';
  const body = `
${renderHeading(`Invoice #${escapeHtml(p.invoiceNumber)} for ${escapeHtml(p.amountFormatted)} is ready`)}
${renderParagraph(`${greeting} &mdash; invoice #${escapeHtml(p.invoiceNumber)} for ${escapeHtml(p.amountFormatted)} is ready to pay. ${dueLine}`)}
${renderCallout('Summary', `<div>Invoice: <strong style="color:#FAFAFA;">#${escapeHtml(p.invoiceNumber)}</strong></div><div>Amount: <strong style="color:#FAFAFA;">${escapeHtml(p.amountFormatted)}</strong></div>${p.dueDate ? `<div>Due: <strong style="color:#FAFAFA;">${escapeHtml(p.dueDate)}</strong></div>` : ''}`)}
${renderButton('Pay invoice', p.payUrl)}
${pdfLine ? renderParagraph(pdfLine) : ''}
${renderParagraph(`Questions? Reply to this email. View all invoices in your <a href="${SITE}/portal/invoices" style="color:#06B6D4;text-decoration:underline;">portal</a>.`)}
`;
  const text = `Invoice #${p.invoiceNumber} for ${p.amountFormatted} is ready.\n\nPay: ${p.payUrl}${p.pdfUrl ? `\nPDF: ${p.pdfUrl}` : ''}${p.dueDate ? `\nDue: ${p.dueDate}` : ''}\n\nReply with any questions.`;
  return {
    subject: `Invoice #${p.invoiceNumber} for ${p.amountFormatted} is ready`,
    html: renderLayout({ recipient: p.to, title: 'New invoice', preheader: `Invoice #${p.invoiceNumber} - ${p.amountFormatted}`, bodyHtml: body }),
    text,
  };
}

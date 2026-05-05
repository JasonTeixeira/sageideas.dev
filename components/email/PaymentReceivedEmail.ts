import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type PaymentReceivedEmailProps = {
  to: string;
  fullName?: string;
  invoiceNumber: string;
  amountFormatted: string;
  paidAt: string;
  receiptUrl?: string;
};

export function renderPaymentReceivedEmail(p: PaymentReceivedEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const body = `
${renderHeading('Payment received. Thank you.')}
${renderParagraph(`${greeting} &mdash; payment for invoice #${escapeHtml(p.invoiceNumber)} cleared. Marking it paid in your portal now.`)}
${renderCallout('Receipt', `<div>Invoice: <strong style="color:#FAFAFA;">#${escapeHtml(p.invoiceNumber)}</strong></div><div>Amount: <strong style="color:#FAFAFA;">${escapeHtml(p.amountFormatted)}</strong></div><div>Paid: <strong style="color:#FAFAFA;">${escapeHtml(p.paidAt)}</strong></div>`)}
${p.receiptUrl ? renderButton('View receipt', p.receiptUrl) : renderButton('Open portal', `${SITE}/portal/invoices`)}
${renderParagraph('No further action needed. We will keep moving on the work.')}
`;
  const text = `Payment received for invoice #${p.invoiceNumber} (${p.amountFormatted}) on ${p.paidAt}.\n\n${p.receiptUrl ? `Receipt: ${p.receiptUrl}` : `Portal: ${SITE}/portal/invoices`}\n\n- Sage`;
  return {
    subject: `Payment received: invoice #${p.invoiceNumber}`,
    html: renderLayout({ recipient: p.to, title: 'Payment received', preheader: `${p.amountFormatted} paid - thank you.`, bodyHtml: body }),
    text,
  };
}

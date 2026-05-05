import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type ReminderLevel = 'gentle' | 'firm' | 'final';

export type InvoiceReminderEmailProps = {
  to: string;
  fullName?: string;
  invoiceNumber: string;
  amountFormatted: string;
  daysOverdue: number;
  level: ReminderLevel;
  payUrl: string;
};

const COPY: Record<ReminderLevel, { subject: (n: string, amt: string) => string; heading: string; intro: (g: string, days: number) => string; closer: string }> = {
  gentle: {
    subject: (n, amt) => `Reminder: invoice #${n} (${amt})`,
    heading: 'Quick reminder on this invoice',
    intro: (g, d) => `${g} &mdash; invoice is ${d} day${d === 1 ? '' : 's'} past due. Probably just slipped through. Link below pays it in two clicks.`,
    closer: 'If something is wrong with the invoice, reply and tell me directly.',
  },
  firm: {
    subject: (n, amt) => `Past due: invoice #${n} (${amt})`,
    heading: 'This invoice needs to clear',
    intro: (g, d) => `${g} &mdash; this is the second nudge. The invoice is ${d} days past due. Work continues, but cash flow needs to keep up.`,
    closer: 'Pay below or reply with a date. Silence is the worst answer here.',
  },
  final: {
    subject: (n, amt) => `Final notice: invoice #${n} (${amt})`,
    heading: 'Final notice on this invoice',
    intro: (g, d) => `${g} &mdash; final notice. The invoice is ${d}+ days past due. After this, work pauses until the balance clears.`,
    closer: 'No drama, just policy. Pay below or reply with a payment plan today.',
  },
};

export function renderInvoiceReminderEmail(p: InvoiceReminderEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const c = COPY[p.level];
  const body = `
${renderHeading(c.heading)}
${renderParagraph(c.intro(greeting, p.daysOverdue))}
${renderCallout('Invoice', `<div>Number: <strong style="color:#FAFAFA;">#${escapeHtml(p.invoiceNumber)}</strong></div><div>Amount: <strong style="color:#FAFAFA;">${escapeHtml(p.amountFormatted)}</strong></div><div>Days past due: <strong style="color:#FAFAFA;">${p.daysOverdue}</strong></div>`)}
${renderButton('Pay now', p.payUrl)}
${renderParagraph(c.closer)}
`;
  const text = `${c.heading}\n\nInvoice #${p.invoiceNumber} for ${p.amountFormatted} is ${p.daysOverdue} days past due.\n\nPay: ${p.payUrl}\n\n${c.closer}\n\n- Sage`;
  return {
    subject: c.subject(p.invoiceNumber, p.amountFormatted),
    html: renderLayout({ recipient: p.to, title: c.heading, preheader: `${p.daysOverdue} days past due.`, bodyHtml: body }),
    text,
  };
}

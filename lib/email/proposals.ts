import { sendEmail, SITE } from './send';

export async function sendProposalEmail(input: {
  to: string | null | undefined;
  proposalTitle: string;
  proposalId: string;
  token: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    // CI / dev safety -- don't fail the route if Resend isn't wired.
    return { ok: false, status: 'queued' as const, reason: 'missing_api_key' };
  }
  if (!input.to) {
    return { ok: false, status: 'queued' as const, reason: 'no_recipient' };
  }

  const url = `${SITE}/portal/proposals/${input.proposalId}?token=${encodeURIComponent(input.token)}`;
  const html = `
    <p>Hi,</p>
    <p>Your proposal "<strong>${escapeHtml(input.proposalTitle)}</strong>" from Sage Ideas Studio is ready to review.</p>
    <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#06b6d4;color:#09090b;border-radius:8px;text-decoration:none;font-weight:500">Review &amp; accept</a></p>
    <p style="color:#71717a;font-size:12px">Or open this link: ${url}</p>
  `;
  return sendEmail({
    to: input.to,
    subject: `Proposal: ${input.proposalTitle}`,
    html,
    text: `Review your proposal: ${url}`,
    templateKey: 'proposal_sent',
    metadata: { proposal_id: input.proposalId },
  });
}

export async function sendProposalAcceptedAdminEmail(input: {
  proposalTitle: string;
  proposalId: string;
  total: number;
  currency: string;
  signerName: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, status: 'queued' as const, reason: 'missing_api_key' };
  }
  const adminTo = process.env.STUDIO_ADMIN_EMAIL ?? 'sage@sageideas.dev';
  const url = `${SITE}/admin/proposals/${input.proposalId}`;
  const html = `
    <p>Heads up — <strong>${escapeHtml(input.signerName)}</strong> just accepted the proposal "<strong>${escapeHtml(input.proposalTitle)}</strong>" for ${input.total.toFixed(2)} ${input.currency.toUpperCase()}.</p>
    <p><a href="${url}">Open in admin</a></p>
  `;
  return sendEmail({
    to: adminTo,
    subject: `Accepted: ${input.proposalTitle}`,
    html,
    text: `Accepted: ${input.proposalTitle} — ${url}`,
    templateKey: 'proposal_accepted_admin',
    metadata: { proposal_id: input.proposalId },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, forbidden, fromZodError, notFound, serverError } from '@/lib/api-errors';
import { sendProposalAcceptedAdminEmail } from '@/lib/email/proposals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2).max(200),
  token: z.string().min(32).max(128),
});

function clientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

type ProposalRow = {
  id: string;
  organization_id: string | null;
  title: string;
  intro: string | null;
  status: string | null;
  total: number | string | null;
  subtotal: number | string | null;
  currency: string | null;
  acceptance_token: string | null;
  acceptance_token_expires: string | null;
  resulting_engagement_id: string | null;
  resulting_invoice_id: string | null;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, token } = parsed.data;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return notFound('Proposal not found');
  const proposal = data as ProposalRow;

  if (!ctx.isAdmin && proposal.organization_id !== ctx.organizationId) {
    return forbidden();
  }
  if (proposal.acceptance_token !== token) return badRequest('Invalid token');
  if (proposal.status !== 'sent' && proposal.status !== 'viewed') {
    return NextResponse.json(
      { error: 'not_acceptable', status: proposal.status },
      { status: 409 },
    );
  }
  if (
    proposal.acceptance_token_expires &&
    new Date(proposal.acceptance_token_expires).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: 'token_expired' }, { status: 410 });
  }

  const ip = clientIp(req);
  const ua = req.headers.get('user-agent') ?? 'unknown';
  const timestamp = new Date().toISOString();
  const hash = createHash('sha256')
    .update(`${name}|${ip}|${ua}|${timestamp}|${proposal.id}`)
    .digest('hex');

  const total = Number(proposal.total ?? 0);
  const subtotal = Number(proposal.subtotal ?? 0);
  const currency = (proposal.currency ?? 'USD').toUpperCase();
  const orgId = proposal.organization_id;
  if (!orgId) return badRequest('Proposal is missing organization_id');

  // 1. Auto-create engagement.
  const today = new Date();
  const target = new Date(today);
  target.setDate(target.getDate() + 30);
  const description = (proposal.intro ?? '').slice(0, 4000) || proposal.title;

  const { data: engRow, error: engErr } = await sb
    .from('engagements')
    .insert({
      organization_id: orgId,
      title: proposal.title,
      service_type: 'consulting',
      status: 'active',
      start_date: today.toISOString().slice(0, 10),
      target_date: target.toISOString().slice(0, 10),
      contract_value: total,
      description,
      pipeline_stage: 'active',
    })
    .select('id')
    .single();
  if (engErr || !engRow) return serverError(engErr?.message ?? 'Engagement insert failed');
  const newEngagementId = engRow.id as string;

  // 2. Auto-create draft invoice.
  const numberSuffix = randomBytes(3).toString('hex').toUpperCase();
  const invoiceNumber = `PROP-${numberSuffix}`;
  const { data: invRow, error: invErr } = await sb
    .from('invoices')
    .insert({
      organization_id: orgId,
      engagement_id: newEngagementId,
      number: invoiceNumber,
      status: 'draft',
      subtotal,
      tax: 0,
      total,
      amount_due: total,
      amount_paid: 0,
      currency,
    })
    .select('id')
    .single();
  if (invErr || !invRow) return serverError(invErr?.message ?? 'Invoice insert failed');
  const newInvoiceId = invRow.id as string;

  // 3. Flip the proposal.
  const { error: updErr } = await sb
    .from('proposals')
    .update({
      status: 'accepted',
      accepted_at: timestamp,
      acceptance_signature_name: name,
      acceptance_signature_ip: ip,
      acceptance_signature_ua: ua,
      acceptance_signature_hash: hash,
      resulting_engagement_id: newEngagementId,
      resulting_invoice_id: newInvoiceId,
    })
    .eq('id', proposal.id);
  if (updErr) return serverError(updErr.message);

  // 4. Audit log + admin email (best-effort).
  try {
    await sb.from('audit_log').insert({
      action: 'proposal.accepted',
      entity_type: 'proposal',
      entity_id: proposal.id,
      organization_id: orgId,
      actor_id: ctx.user.id,
      after: {
        proposal_id: proposal.id,
        engagement_id: newEngagementId,
        invoice_id: newInvoiceId,
        signer_name: name,
        total,
        currency,
      },
    });
  } catch {
    // non-fatal
  }

  void sendProposalAcceptedAdminEmail({
    proposalId: proposal.id,
    proposalTitle: proposal.title,
    total,
    currency,
    signerName: name,
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    engagement_id: newEngagementId,
    invoice_id: newInvoiceId,
    timestamp,
    hash,
  });
}

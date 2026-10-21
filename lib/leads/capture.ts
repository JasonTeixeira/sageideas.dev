import { supabaseAdmin } from '@/lib/supabase/server';
import { buildInboundAcquisitionCandidate } from '@/lib/acquisition/inbound';
import { sendEmail } from '@/lib/email/send';
import { scoreLead } from './scoring';

export type LeadSource = 'contact' | 'newsletter' | 'seo_audit' | 'checkout';

export type LeadInput = {
  source: LeadSource;
  email: string | null;
  name: string | null;
  detail: string;
  inquiryType?: string;
  budget?: string;
  amountCents?: number | null;
  metadata?: Record<string, unknown>;
  /** Set to false to skip the operator notification email (persist-only). Default: true. */
  notify?: boolean;
};

/**
 * Persist a lead to the `leads` table and fire a lightweight notification email.
 * Both operations are best-effort: errors are logged but never surfaced to the
 * caller. Wire this into any lead-generating route (contact form, newsletter
 * signup, checkout, etc.) without worrying about degrading the happy path.
 */
async function incrementAcquisitionDailyMetrics(patch: Record<string, number>) {
  const sb = supabaseAdmin();
  const metricDate = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from('acquisition_daily_metrics')
    .select('*')
    .eq('metric_date', metricDate)
    .maybeSingle();

  const next: Record<string, unknown> = { metric_date: metricDate, updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = Number(data?.[key] ?? 0) + value;
  }

  await sb.from('acquisition_daily_metrics').upsert(next, { onConflict: 'metric_date' });
}

async function acquisitionAccountExists(args: {
  leadId?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  domain?: string | null;
}) {
  const sb = supabaseAdmin();

  if (args.leadId) {
    const { data } = await sb.from('acquisition_accounts').select('id').eq('lead_id', args.leadId).limit(1);
    if (data?.length) return true;
  }

  if (args.websiteUrl) {
    const { data } = await sb
      .from('acquisition_accounts')
      .select('id')
      .eq('website_url', args.websiteUrl)
      .limit(1);
    if (data?.length) return true;
  }

  if (args.email) {
    const { data } = await sb
      .from('acquisition_contacts')
      .select('account_id')
      .eq('email', args.email.toLowerCase())
      .limit(1);
    if (data?.length) return true;
  }

  if (args.domain) {
    const { data } = await sb
      .from('acquisition_accounts')
      .select('id')
      .ilike('website_url', `%://${args.domain}%`)
      .limit(1);
    if (data?.length) return true;
  }

  return false;
}

async function mirrorLeadToAcquisition(input: LeadInput, leadId: string | null) {
  const candidate = buildInboundAcquisitionCandidate({ ...input, leadId });
  if (!candidate) return;
  if (await acquisitionAccountExists({ leadId, ...candidate.lookup })) return;

  const sb = supabaseAdmin();
  const { data: account, error } = await sb
    .from('acquisition_accounts')
    .insert(candidate.account)
    .select('id')
    .maybeSingle();
  if (error || !account) {
    if (error) console.error('[captureLead] acquisition account mirror error:', error.message);
    return;
  }

  if (candidate.contact.email || candidate.contact.full_name || candidate.contact.title) {
    const { error: contactError } = await sb.from('acquisition_contacts').insert({
      ...candidate.contact,
      account_id: account.id,
    });
    if (contactError) console.error('[captureLead] acquisition contact mirror error:', contactError.message);
  }

  await incrementAcquisitionDailyMetrics(candidate.metrics);
}

export async function captureLead(input: LeadInput): Promise<string | null> {
  const scoring = scoreLead(input);
  const metadata = {
    ...(input.metadata ?? {}),
    lead_score: scoring.score,
    lead_score_reasons: scoring.reasons,
  };
  let leadId: string | null = null;

  // Persist — supabaseAdmin() uses service-role key and bypasses RLS.
  // It throws if env vars are absent; that throw is caught here so the
  // caller's happy path is never affected.
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from('leads').insert({
      source:       input.source,
      email:        input.email,
      name:         input.name,
      detail:       input.detail,
      inquiry_type: input.inquiryType ?? null,
      budget:       input.budget ?? null,
      amount_cents: input.amountCents ?? null,
      metadata,
    }).select('id').maybeSingle();
    if (error) {
      console.error('[captureLead] persist error:', error.message);
    } else {
      leadId = data?.id ?? null;
      await mirrorLeadToAcquisition({ ...input, metadata }, leadId);
    }
  } catch (e) {
    console.error('[captureLead] persist failed:', e);
  }

  // Notify — only when enabled (default true) and we have a reply-to address.
  try {
    if ((input.notify !== false) && input.email) {
      const notificationText = [
        input.detail,
        `Email: ${input.email}`,
        `Name: ${input.name ?? '—'}`,
        input.inquiryType ? `Inquiry type: ${input.inquiryType}` : '',
        input.budget ? `Budget: ${input.budget}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const result = await sendEmail({
        from:    'Sage Ideas Leads <leads@sageideas.dev>',
        to:      'sage@sageideas.dev',
        replyTo: input.email,
        subject: `New ${input.source} lead`,
        html: `<pre>${notificationText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
        text: notificationText,
        templateKey: 'lead_operator_notification',
        metadata: { leadId, source: input.source },
      });
      if (!result.ok) {
        console.error('[captureLead] notify error:', result.reason);
      }
    }
  } catch (e) {
    console.error('[captureLead] notify failed:', e);
  }

  return leadId;
}

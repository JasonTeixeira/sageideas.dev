import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signToken } from '@/lib/newsletter';
import {
  buildEmailIdempotencyKey,
  calculateEmailRetryDisposition,
  DELIVERED_EMAIL_STATUSES,
  isRetryableEmailFailure,
  validateEmailDeliveryInput,
} from '@/lib/communications/delivery-policy';

export const FROM = 'Sage Ideas <sage@sageideas.dev>';
export const REPLY_TO = 'sage@sageideas.dev';
export const SITE = 'https://www.sageideas.dev';

export type SendEmailInput = {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  templateKey?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string; status: 'sent' }
  | { ok: false; status: 'failed' | 'dead_lettered'; reason: string };

function unsubHeader(to: string | string[]) {
  const recipient = Array.isArray(to) ? to[0] : to;
  const token = signToken(recipient, 'email', 'unsubscribe');
  const url = `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

async function logEmail(row: {
  user_id?: string | null;
  recipient: string;
  subject: string;
  template_key?: string | null;
  status: 'sent' | 'failed';
  idempotency_key: string;
  retryable?: boolean;
  provider_message_id?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<'sent' | 'failed' | 'dead_lettered' | 'ledger_failed'> {
  try {
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from('email_log')
      .select('attempt_count, metadata')
      .eq('idempotency_key', row.idempotency_key)
      .maybeSingle();
    const attempt = Number(existing?.attempt_count ?? 0) + 1;
    const disposition = row.status === 'sent'
      ? { status: 'sent' as const, retryAfterSeconds: null }
      : calculateEmailRetryDisposition({ attempt, retryable: row.retryable !== false });
    const now = new Date();
    const { error } = await sb.from('email_log').upsert({
      user_id: row.user_id ?? null,
      recipient: row.recipient,
      subject: row.subject,
      template_key: row.template_key ?? null,
      status: disposition.status,
      provider_message_id: row.provider_message_id ?? null,
      idempotency_key: row.idempotency_key,
      attempt_count: attempt,
      next_retry_at: disposition.retryAfterSeconds === null
        ? null
        : new Date(now.getTime() + disposition.retryAfterSeconds * 1000).toISOString(),
      last_attempt_at: now.toISOString(),
      error: row.error ?? null,
      metadata: { ...((existing?.metadata as Record<string, unknown> | null) ?? {}), ...(row.metadata ?? {}) },
    }, { onConflict: 'idempotency_key' });
    if (error) throw error;
    return disposition.status;
  } catch (err) {
    console.warn('[email] log insert failed:', err instanceof Error ? err.message : err);
    return 'ledger_failed';
  }
}

function failureDeliveryStatus(status: 'sent' | 'failed' | 'dead_lettered' | 'ledger_failed'): 'failed' | 'dead_lettered' {
  return status === 'dead_lettered' ? 'dead_lettered' : 'failed';
}

async function existingSuccessfulDelivery(idempotencyKey: string) {
  try {
    const { data } = await supabaseAdmin()
      .from('email_log')
      .select('status, provider_message_id, next_retry_at')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (data && (DELIVERED_EMAIL_STATUSES as readonly string[]).includes(String(data.status))) {
      return { status: 'sent' as const, id: String(data.provider_message_id ?? 'already-sent') };
    }
    if (['dead_lettered', 'bounced', 'complained', 'unsubscribed'].includes(String(data?.status))) {
      return { status: 'dead_lettered' as const, id: null };
    }
    if (data?.status === 'failed' && data.next_retry_at && new Date(String(data.next_retry_at)).getTime() > Date.now()) {
      return { status: 'retry_later' as const, id: null };
    }
  } catch (error) {
    console.warn('[email] idempotency lookup failed:', error instanceof Error ? error.message : error);
  }
  return null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const validation = validateEmailDeliveryInput(input);
  if (!validation.ok) return { ok: false, status: 'failed', reason: 'invalid_email_input' };
  let idempotencyKey: string;
  try {
    idempotencyKey = buildEmailIdempotencyKey(input);
  } catch {
    return { ok: false, status: 'failed', reason: 'invalid_idempotency_key' };
  }
  const priorDelivery = await existingSuccessfulDelivery(idempotencyKey);
  if (priorDelivery?.status === 'sent') return { ok: true, id: priorDelivery.id, status: 'sent' };
  if (priorDelivery?.status === 'dead_lettered') {
    return { ok: false, status: 'dead_lettered', reason: 'delivery_dead_lettered' };
  }
  if (priorDelivery?.status === 'retry_later') {
    return { ok: false, status: 'failed', reason: 'delivery_retry_not_due' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = Array.isArray(input.to) ? input.to[0] : input.to;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — delivery failed for', recipient);
    const status = await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'failed',
      idempotency_key: idempotencyKey,
      retryable: true,
      error: 'missing_api_key',
      metadata: input.metadata,
    });
    return { ok: false, status: failureDeliveryStatus(status), reason: 'missing_api_key' };
  }

  try {
    const resend = new Resend(apiKey);
    const payload = {
      from: input.from ?? FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? REPLY_TO,
      headers: { ...unsubHeader(input.to), ...(input.headers ?? {}) },
      attachments: input.attachments,
    } as Parameters<typeof resend.emails.send>[0];

    const { data, error } = await resend.emails.send(payload, { idempotencyKey });
    if (error) {
      console.warn('[email] resend error:', error.message);
      const status = await logEmail({
        user_id: input.userId,
        recipient,
        subject: input.subject,
        template_key: input.templateKey,
        status: 'failed',
        idempotency_key: idempotencyKey,
        retryable: isRetryableEmailFailure(error),
        error: error.message,
        metadata: input.metadata,
      });
      return { ok: false, status: failureDeliveryStatus(status), reason: 'provider_rejected' };
    }
    const ledgerStatus = await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'sent',
      idempotency_key: idempotencyKey,
      provider_message_id: data?.id ?? null,
      metadata: input.metadata,
    });
    if (ledgerStatus === 'ledger_failed') {
      return { ok: false, status: 'failed', reason: 'delivery_ledger_failed' };
    }
    return { ok: true, id: data?.id ?? '', status: 'sent' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[email] threw:', message);
    const status = await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'failed',
      idempotency_key: idempotencyKey,
      retryable: isRetryableEmailFailure(err),
      error: message,
      metadata: input.metadata,
    });
    return { ok: false, status: failureDeliveryStatus(status), reason: 'provider_unavailable' };
  }
}

export async function sendBatch(emails: SendEmailInput[]): Promise<SendEmailResult[]> {
  if (emails.length < 1 || emails.length > 100 || emails.some((email) => !validateEmailDeliveryInput(email).ok)) {
    return emails.map(() => ({ ok: false, status: 'failed', reason: 'invalid_email_input' }));
  }
  const batchIdempotencyKey = buildEmailIdempotencyKey({
    to: emails.flatMap((email) => Array.isArray(email.to) ? email.to : [email.to]),
    subject: emails.map((email) => email.subject).join('\n'),
    html: emails.map((email) => email.html).join('\n'),
    text: emails.map((email) => email.text ?? '').join('\n'),
    templateKey: 'batch',
    metadata: { itemKeys: emails.map((email) => email.idempotencyKey ?? null) },
  });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — batch delivery failed for', emails.length, 'messages');
    const results: SendEmailResult[] = [];
    for (let index = 0; index < emails.length; index++) {
      const e = emails[index];
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      const status = await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'failed',
        idempotency_key: `${batchIdempotencyKey}:i${index}`,
        retryable: true,
        error: 'missing_api_key',
        metadata: e.metadata,
      });
      results.push({ ok: false, status: failureDeliveryStatus(status), reason: 'missing_api_key' });
    }
    return results;
  }

  try {
    const resend = new Resend(apiKey);
    const payload = emails.map((e) => ({
      from: e.from ?? FROM,
      to: e.to,
      subject: e.subject,
      html: e.html,
      text: e.text,
      replyTo: e.replyTo ?? REPLY_TO,
      headers: { ...unsubHeader(e.to), ...(e.headers ?? {}) },
    })) as Parameters<typeof resend.batch.send>[0];

    const { data, error } = await resend.batch.send(payload, { idempotencyKey: batchIdempotencyKey });
    if (error) {
      const results: SendEmailResult[] = [];
      for (let index = 0; index < emails.length; index++) {
        const e = emails[index];
        const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
        const status = await logEmail({
          user_id: e.userId,
          recipient,
          subject: e.subject,
          template_key: e.templateKey,
          status: 'failed',
          idempotency_key: `${batchIdempotencyKey}:i${index}`,
          retryable: isRetryableEmailFailure(error),
          error: error.message,
          metadata: e.metadata,
        });
        results.push({ ok: false, status: failureDeliveryStatus(status), reason: 'provider_rejected' });
      }
      return results;
    }
    const ids = (data?.data ?? []) as Array<{ id: string }>;
    const results: SendEmailResult[] = [];
    for (let i = 0; i < emails.length; i++) {
      const e = emails[i];
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      const id = ids[i]?.id ?? '';
      const ledgerStatus = await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'sent',
        idempotency_key: `${batchIdempotencyKey}:i${i}`,
        provider_message_id: id || null,
        metadata: e.metadata,
      });
      results.push(ledgerStatus === 'ledger_failed'
        ? { ok: false, status: 'failed', reason: 'delivery_ledger_failed' }
        : { ok: true, id, status: 'sent' });
    }
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[email] batch threw:', message);
    const results: SendEmailResult[] = [];
    for (let index = 0; index < emails.length; index++) {
      const e = emails[index];
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      const status = await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'failed',
        idempotency_key: `${batchIdempotencyKey}:i${index}`,
        retryable: isRetryableEmailFailure(err),
        error: message,
        metadata: e.metadata,
      });
      results.push({ ok: false, status: failureDeliveryStatus(status), reason: 'provider_unavailable' });
    }
    return results;
  }
}

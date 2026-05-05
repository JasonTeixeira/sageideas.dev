import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';

export const FROM = 'Sage Ideas <sage@sageideas.dev>';
export const REPLY_TO = 'sage@sageideas.dev';
export const SITE = 'https://www.sageideas.dev';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  templateKey?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>;
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string; status: 'sent' }
  | { ok: false; status: 'queued' | 'failed'; reason: string };

function unsubHeader(to: string | string[]) {
  const recipient = Array.isArray(to) ? to[0] : to;
  return {
    'List-Unsubscribe': `<${SITE}/unsubscribe?email=${encodeURIComponent(recipient)}>`,
  };
}

async function logEmail(row: {
  user_id?: string | null;
  recipient: string;
  subject: string;
  template_key?: string | null;
  status: 'queued' | 'sent' | 'failed';
  provider_message_id?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from('email_log').insert({
      user_id: row.user_id ?? null,
      recipient: row.recipient,
      subject: row.subject,
      template_key: row.template_key ?? null,
      status: row.status,
      provider_message_id: row.provider_message_id ?? null,
      error: row.error ?? null,
      metadata: row.metadata ?? {},
    });
  } catch (err) {
    console.warn('[email] log insert failed:', err instanceof Error ? err.message : err);
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = Array.isArray(input.to) ? input.to[0] : input.to;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — queued for', recipient);
    await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'queued',
      error: 'missing_api_key',
      metadata: input.metadata,
    });
    return { ok: false, status: 'queued', reason: 'missing_api_key' };
  }

  try {
    const resend = new Resend(apiKey);
    const payload = {
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? REPLY_TO,
      headers: { ...unsubHeader(input.to), ...(input.headers ?? {}) },
      attachments: input.attachments,
    } as Parameters<typeof resend.emails.send>[0];

    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.warn('[email] resend error:', error.message);
      await logEmail({
        user_id: input.userId,
        recipient,
        subject: input.subject,
        template_key: input.templateKey,
        status: 'failed',
        error: error.message,
        metadata: input.metadata,
      });
      return { ok: false, status: 'failed', reason: error.message };
    }
    await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'sent',
      provider_message_id: data?.id ?? null,
      metadata: input.metadata,
    });
    return { ok: true, id: data?.id ?? '', status: 'sent' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[email] threw:', message);
    await logEmail({
      user_id: input.userId,
      recipient,
      subject: input.subject,
      template_key: input.templateKey,
      status: 'failed',
      error: message,
      metadata: input.metadata,
    });
    return { ok: false, status: 'failed', reason: message };
  }
}

export async function sendBatch(emails: SendEmailInput[]): Promise<SendEmailResult[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — batch of', emails.length, 'queued');
    const results: SendEmailResult[] = [];
    for (const e of emails) {
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'queued',
        error: 'missing_api_key',
        metadata: e.metadata,
      });
      results.push({ ok: false, status: 'queued', reason: 'missing_api_key' });
    }
    return results;
  }

  try {
    const resend = new Resend(apiKey);
    const payload = emails.map((e) => ({
      from: FROM,
      to: e.to,
      subject: e.subject,
      html: e.html,
      text: e.text,
      replyTo: e.replyTo ?? REPLY_TO,
      headers: { ...unsubHeader(e.to), ...(e.headers ?? {}) },
    })) as Parameters<typeof resend.batch.send>[0];

    const { data, error } = await resend.batch.send(payload);
    if (error) {
      const results: SendEmailResult[] = [];
      for (const e of emails) {
        const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
        await logEmail({
          user_id: e.userId,
          recipient,
          subject: e.subject,
          template_key: e.templateKey,
          status: 'failed',
          error: error.message,
          metadata: e.metadata,
        });
        results.push({ ok: false, status: 'failed', reason: error.message });
      }
      return results;
    }
    const ids = (data?.data ?? []) as Array<{ id: string }>;
    const results: SendEmailResult[] = [];
    for (let i = 0; i < emails.length; i++) {
      const e = emails[i];
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      const id = ids[i]?.id ?? '';
      await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'sent',
        provider_message_id: id || null,
        metadata: e.metadata,
      });
      results.push({ ok: true, id, status: 'sent' });
    }
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.warn('[email] batch threw:', message);
    const results: SendEmailResult[] = [];
    for (const e of emails) {
      const recipient = Array.isArray(e.to) ? e.to[0] : e.to;
      await logEmail({
        user_id: e.userId,
        recipient,
        subject: e.subject,
        template_key: e.templateKey,
        status: 'failed',
        error: message,
        metadata: e.metadata,
      });
      results.push({ ok: false, status: 'failed', reason: message });
    }
    return results;
  }
}

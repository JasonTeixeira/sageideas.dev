import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FROM = 'Sage Ideas Contact <contact@sageideas.dev>';
const TO = 'sage@sageideas.dev';

const ContactSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    email: z.string().trim().email('Invalid email').max(320),
    message: z.string().trim().max(5000).optional().default(''),
    honey: z.string().optional(),
  })
  .passthrough();

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label: string, value: string) {
  if (!value) return '';
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #27272A;color:#A1A1AA;font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.08em;width:140px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #27272A;color:#FAFAFA;font:14px -apple-system,system-ui,sans-serif">${escapeHtml(value).replace(/\n/g, '<br/>')}</td></tr>`;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000, prefix: 'contact' });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot — pretend success.
  if (data.honey) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY missing');
    return NextResponse.json({ ok: false, error: 'Email service unavailable' }, { status: 502 });
  }

  // Collect any extra fields that came along (subject, company, website, etc.)
  // for inclusion in the email body, while keeping the typed required fields.
  const known = new Set(['name', 'email', 'message', 'honey']);
  const extras: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (known.has(k)) continue;
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    extras.push([k, s.slice(0, 2000)]);
  }

  const displayName = data.name || data.email;
  const subject = `New contact: ${displayName}`;

  const extraRows = extras
    .map(([k, v]) => row(k.charAt(0).toUpperCase() + k.slice(1), v))
    .join('');

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,system-ui,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;color:#FAFAFA">
  <div style="font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.12em;color:#06B6D4;margin-bottom:8px">New contact form submission</div>
  <h1 style="font-size:22px;margin:0 0 24px;color:#FAFAFA">${escapeHtml(displayName)}</h1>
  <table style="width:100%;border-collapse:collapse;background:#0F0F12;border:1px solid #27272A;border-radius:12px;overflow:hidden">
    ${row('Name', data.name)}
    ${row('Email', data.email)}
    ${extraRows}
    ${row('Message', data.message || '(no message provided)')}
  </table>
  <p style="font-size:12px;color:#71717A;margin-top:24px">Reply directly to ${escapeHtml(data.email)}.</p>
</div></body></html>`;

  const textLines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    ...extras.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    data.message || '(no message provided)',
  ];
  const text = textLines.join('\n');

  try {
    const resend = new Resend(apiKey);
    const { data: sent, error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: data.email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[contact] resend error:', error.message);
      return NextResponse.json({ ok: false, error: 'Failed to send message' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: sent?.id ?? '' }, { status: 200 });
  } catch (err) {
    console.error('[contact] resend threw:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'Failed to send message' }, { status: 502 });
  }
}

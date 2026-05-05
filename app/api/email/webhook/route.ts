import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    subject?: string;
    [key: string]: unknown;
  };
};

const STATUS_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
};

function verifySignature(secret: string, headers: Headers, rawBody: string): boolean {
  // Resend uses Svix-style headers: svix-id, svix-timestamp, svix-signature
  const svixId = headers.get('svix-id') ?? '';
  const svixTimestamp = headers.get('svix-timestamp') ?? '';
  const svixSignature = headers.get('svix-signature') ?? '';
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Secret format from Svix is `whsec_<base64>`
  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret);
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // svix-signature format: "v1,<base64sig> v1,<base64sig2>"
  const signatures = svixSignature.split(' ').map((s) => s.split(',')[1]).filter(Boolean);
  return signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[email-webhook] RESEND_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!verifySignature(secret, req.headers, rawBody)) {
    console.warn('[email-webhook] invalid signature');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const status = STATUS_MAP[event.type];
  const messageId = event.data?.email_id ?? '';
  if (!status || !messageId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from('email_log')
    .select('id, metadata')
    .eq('provider_message_id', messageId)
    .maybeSingle();

  const prevMeta = ((existing?.metadata as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...prevMeta };
  if (event.type === 'email.opened') {
    merged.open_count = ((merged.open_count as number) ?? 0) + 1;
    merged.last_opened_at = event.created_at ?? new Date().toISOString();
  } else if (event.type === 'email.clicked') {
    merged.click_count = ((merged.click_count as number) ?? 0) + 1;
    merged.last_clicked_at = event.created_at ?? new Date().toISOString();
  } else {
    merged[`${status}_at`] = event.created_at ?? new Date().toISOString();
    if (event.data) merged[`${status}_data`] = event.data;
  }

  if (existing?.id) {
    // Don't downgrade a terminal status by overwriting with a transient one.
    const isTerminal = ['bounced', 'complained', 'failed'].includes(status);
    const update: Record<string, unknown> = { metadata: merged };
    if (isTerminal || status === 'delivered') update.status = status;
    await sb.from('email_log').update(update).eq('id', existing.id);
  } else {
    // Webhook arrived without a prior log row — record it for trace.
    const recipient = Array.isArray(event.data?.to) ? event.data?.to?.[0] : (event.data?.to ?? '');
    await sb.from('email_log').insert({
      recipient: recipient ?? 'unknown',
      subject: event.data?.subject ?? null,
      status,
      provider_message_id: messageId,
      metadata: merged,
    });
  }

  return NextResponse.json({ ok: true });
}

// Reject other methods explicitly (returns 405 for GET/etc)
export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
}

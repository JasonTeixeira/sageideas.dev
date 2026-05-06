import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sendEmail } from '@/lib/email/send';
import { renderAuthEmailHtml, type AuthEmailKind } from '@/lib/emails/authEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Payload = {
  user?: { email?: string; user_metadata?: { full_name?: string } };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

function getRawSecret(): Buffer | null {
  const raw = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!raw) return null;
  // Supabase issues secrets like `v1,whsec_<base64>`. Strip the prefix(es) and decode.
  const parts = raw.split(',');
  const last = parts[parts.length - 1].trim();
  const b64 = last.startsWith('whsec_') ? last.slice('whsec_'.length) : last;
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

function verify(req: { id: string; ts: string; body: string; sigHeader: string; secret: Buffer }): boolean {
  const signed = `${req.id}.${req.ts}.${req.body}`;
  const expected = createHmac('sha256', req.secret).update(signed).digest('base64');
  // Header looks like: "v1,<sig> v1,<sig2>" — multiple sigs separated by spaces.
  const provided = req.sigHeader
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('v1,') ? s.slice(3) : s));
  for (const p of provided) {
    if (p.length !== expected.length) continue;
    try {
      if (timingSafeEqual(Buffer.from(p), Buffer.from(expected))) return true;
    } catch {
      // length mismatch on raw bytes — skip
    }
  }
  return false;
}

// Map Supabase email_action_type values onto the OTP `type` values that
// verifyOtp accepts. The two diverge for email-change events.
function otpTypeFor(action: string): string {
  if (action === 'email_change_current' || action === 'email_change_new') return 'email_change';
  return action;
}

function buildConfirmUrl(siteUrl: string, tokenHash: string, action: string, redirectTo?: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: otpTypeFor(action),
  });
  if (redirectTo) params.set('next', redirectTo);
  // /auth/callback already handles token_hash + type via verifyOtp.
  return `${base}/auth/callback?${params.toString()}`;
}

function errorResponse(message: string, http_code: number) {
  return NextResponse.json({ error: { message, http_code } }, { status: http_code });
}

export async function POST(request: NextRequest) {
  const secret = getRawSecret();
  if (!secret) {
    return errorResponse('hook_secret_not_configured', 500);
  }

  const id = request.headers.get('webhook-id');
  const ts = request.headers.get('webhook-timestamp');
  const sigHeader = request.headers.get('webhook-signature');
  if (!id || !ts || !sigHeader) {
    return errorResponse('missing_signature_headers', 400);
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return errorResponse('cannot_read_body', 400);
  }

  if (!verify({ id, ts, body, sigHeader, secret })) {
    return errorResponse('invalid_signature', 401);
  }

  let payload: Payload;
  try {
    payload = JSON.parse(body) as Payload;
  } catch {
    return errorResponse('invalid_json', 400);
  }

  const email = payload.user?.email;
  const tokenHash = payload.email_data?.token_hash;
  const action = (payload.email_data?.email_action_type ?? '') as AuthEmailKind;
  const siteUrl = payload.email_data?.site_url ?? 'https://www.sageideas.dev';
  const redirectTo = payload.email_data?.redirect_to;

  if (!email || !tokenHash || !action) {
    return errorResponse('missing_payload_fields', 400);
  }

  const url = buildConfirmUrl(siteUrl, tokenHash, action, redirectTo);
  const fullName = payload.user?.user_metadata?.full_name;
  const { subject, html, text } = renderAuthEmailHtml({
    recipient: email,
    kind: action,
    url,
    fullName,
  });

  const result = await sendEmail({
    to: email,
    subject,
    html,
    text,
    templateKey: `auth_${action}`,
    metadata: { hook: 'send_email', action },
  });

  if (!result.ok) {
    return errorResponse(`send_failed:${result.reason}`, 502);
  }

  return NextResponse.json({}, { status: 200 });
}

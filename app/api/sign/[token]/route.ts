import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function clientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip') || null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? '').trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: doc, error: docErr } = await sb
    .from('documents')
    .select(
      'id, body_md, status, signing_token, signing_token_expires, signing_token_used',
    )
    .eq('signing_token', token)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json({ error: 'token_not_found' }, { status: 404 });
  }
  if (doc.signing_token_used || doc.status === 'signed') {
    return NextResponse.json({ error: 'already_signed' }, { status: 409 });
  }
  if (
    doc.signing_token_expires &&
    new Date(doc.signing_token_expires).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: 'token_expired' }, { status: 410 });
  }

  const ip = clientIp(req) ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const timestamp = new Date();
  const timestampIso = timestamp.toISOString();
  const hash = crypto
    .createHash('sha256')
    .update(`${name}|${timestampIso}|${doc.body_md ?? ''}`)
    .digest('hex');

  const { error: updErr } = await sb
    .from('documents')
    .update({
      status: 'signed',
      signed_at: timestampIso,
      signature_name: name,
      signature_ip: ip,
      signature_user_agent: userAgent,
      signature_timestamp: timestampIso,
      signature_hash: hash,
      signing_token_used: true,
    })
    .eq('id', doc.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Audit-trail row in signature_audits (best-effort).
  try {
    await sb.from('signature_audits').insert({
      document_id: doc.id,
      signer_name: name,
      signer_email: '',
      signature_data: hash,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    document_id: doc.id,
    timestamp: timestampIso,
    hash,
  });
}

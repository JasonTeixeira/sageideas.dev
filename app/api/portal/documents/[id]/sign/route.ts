import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, forbidden, fromZodError, notFound, serverError } from '@/lib/api-errors';

const schema = z.object({
  signature_data: z.string().min(1).max(2_000_000),
  signer_name: z.string().min(1).max(200).optional(),
  signer_email: z.string().email().max(254).optional(),
  user_agent: z.string().max(500).optional(),
});

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
    return badRequest('Invalid JSON body');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const { signature_data, signer_name, signer_email, user_agent } = parsed.data;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const sb = supabaseAdmin();

  const { data: doc } = await sb.from('documents').select('*').eq('id', id).single();
  if (!doc) return notFound('Document not found');
  if (!ctx.isAdmin && doc.organization_id !== ctx.organizationId) {
    return forbidden();
  }

  const { error: auditErr } = await sb.from('signature_audits').insert({
    document_id: id,
    signer_id: ctx.user.id,
    signer_name,
    signer_email,
    signature_data,
    ip_address: ip,
    user_agent,
  });
  if (auditErr) return serverError(auditErr.message);

  await sb
    .from('documents')
    .update({ status: 'signed', signed_at: new Date().toISOString() })
    .eq('id', id);

  await sb.from('activity').insert({
    organization_id: doc.organization_id,
    engagement_id: doc.engagement_id,
    actor_id: ctx.user.id,
    type: 'document.signed',
    payload: { document_id: id, document_title: doc.title },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function substitute(body: string, values: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key]) {
      return values[key];
    }
    return `{{${key}}}`;
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const templateId = String(body.template_id ?? '').trim();
  if (!templateId) {
    return NextResponse.json({ error: 'missing_template' }, { status: 400 });
  }
  const orgId = (body.organization_id as string | null) || null;
  const engagementId = (body.engagement_id as string | null) || null;
  const docTitle = String(body.title ?? '').trim();
  const values = (body.values as Record<string, string>) || {};

  const sb = supabaseAdmin();
  const { data: template, error: tErr } = await sb
    .from('contract_templates')
    .select('id, slug, title, body_md, category, variables')
    .eq('id', templateId)
    .maybeSingle();
  if (tErr || !template) {
    return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
  }

  const renderedBody = substitute(template.body_md ?? '', values);
  const hash = crypto
    .createHash('sha256')
    .update(renderedBody)
    .digest('hex');

  const docType =
    template.category && ['contract', 'sow', 'nda', 'amendment'].includes(template.category)
      ? template.category
      : template.category === 'msa'
        ? 'contract'
        : template.category === 'change_order'
          ? 'amendment'
          : 'other';

  const signingToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);

  const { data: doc, error } = await sb
    .from('documents')
    .insert({
      organization_id: orgId,
      engagement_id: engagementId,
      template_id: template.id,
      title: docTitle || template.title,
      body_md: renderedBody,
      type: docType,
      status: 'draft',
      hash_sha256: hash,
      signing_token: signingToken,
      signing_token_expires: expires.toISOString(),
      signing_token_used: false,
    })
    .select('id, title, signing_token, signing_token_expires')
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json(
      { error: error?.message || 'create_failed' },
      { status: 400 },
    );
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'contract.generate',
    entityType: 'document',
    entityId: doc.id,
    after: { template_id: template.id, organization_id: orgId, engagement_id: engagementId },
  });

  return NextResponse.json({
    id: doc.id,
    signing_token: doc.signing_token,
    signing_url: `/portal/documents/${doc.id}/sign?token=${encodeURIComponent(doc.signing_token)}`,
    expires: doc.signing_token_expires,
  });
}

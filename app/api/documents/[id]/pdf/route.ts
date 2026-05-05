import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { DocumentPDF } from '@/components/pdf/DocumentPDF';
import { ContractPDF } from '@/components/pdf/ContractPDF';
import { renderPdfBuffer, pdfResponse } from '@/lib/pdf-render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = profile?.app_role === 'admin';

  const { data: doc } = await admin
    .from('documents')
    .select(
      'id, title, body_md, type, organization_id, status, signed_at, signature_name, signature_timestamp, signature_ip, signature_user_agent, signature_hash',
    )
    .eq('id', id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!isAdmin) {
    const { data: appUser } = await admin
      .from('app_users')
      .select('organization_id')
      .eq('clerk_id', user.id)
      .maybeSingle();
    if (!appUser || appUser.organization_id !== doc.organization_id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const isSignable =
    doc.type === 'contract' ||
    doc.type === 'sow' ||
    doc.type === 'nda' ||
    doc.type === 'amendment';

  const element = isSignable
    ? ContractPDF({
        title: doc.title,
        body: doc.body_md ?? '',
        signature:
          doc.status === 'signed'
            ? {
                name: doc.signature_name,
                timestamp: doc.signature_timestamp,
                ip: doc.signature_ip,
                userAgent: doc.signature_user_agent,
                hash: doc.signature_hash,
              }
            : null,
      })
    : DocumentPDF({
        title: doc.title,
        body: doc.body_md ?? '',
        type: doc.type,
      });

  const buf = await renderPdfBuffer(element);
  return pdfResponse(buf, `${doc.title}.pdf`);
}

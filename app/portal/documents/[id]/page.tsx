import { notFound } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { SignaturePad } from '@/components/portal/signature-pad';
import { formatDate } from '@/lib/utils';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: doc } = await sb
    .from('documents')
    .select('*, signature_audits(*)')
    .eq('id', id)
    .single();
  if (!doc) notFound();
  if (!ctx.isAdmin && doc.organization_id !== ctx.organizationId) notFound();

  const audits = doc.signature_audits ?? [];
  const isSigned = doc.status === 'signed' || doc.status === 'countersigned';

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Dashboard', href: '/portal' },
          { label: 'Documents', href: '/portal/documents' },
          { label: doc.title },
        ]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
            <Badge tone={isSigned ? 'emerald' : doc.status === 'sent' ? 'amber' : 'neutral'}>
              {doc.status}
            </Badge>
            <Badge tone="neutral">{doc.type}</Badge>
          </div>
          {doc.signed_at && (
            <p className="text-xs text-[#71717a]">Signed {formatDate(doc.signed_at)}</p>
          )}
        </div>

        {/* Body */}
        <Card>
          <CardContent className="p-8">
            {doc.body_md ? (
              <div className="text-sm leading-relaxed text-[#d4d4d8] whitespace-pre-wrap">
                {doc.body_md}
              </div>
            ) : (
              <p className="text-sm text-[#71717a]">No content body — this document was uploaded as a PDF.</p>
            )}
          </CardContent>
        </Card>

        {/* Signature panel */}
        {!isSigned ? (
          <SignaturePad
            documentId={doc.id}
            signerName={ctx.user.full_name ?? ctx.user.email}
            signerEmail={ctx.user.email}
          />
        ) : (
          audits.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="text-sm font-medium mb-3 text-[#fafafa]">Audit trail</div>
                <ul className="space-y-2 text-xs text-[#a1a1aa]">
                  {audits.map((a: any) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className="mono text-[#71717a] shrink-0">
                        {formatDate(a.signed_at)}
                      </div>
                      <div>
                        <div className="text-[#fafafa]">{a.signer_name}</div>
                        <div className="mono text-[10px] mt-0.5">
                          IP {a.ip_address} · {a.user_agent?.slice(0, 60)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </>
  );
}

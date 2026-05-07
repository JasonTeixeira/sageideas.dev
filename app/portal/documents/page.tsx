import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { getDocumentsForOrg } from '@/lib/portal/queries';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ORG_QUOTA_BYTES } from '@/lib/portal/storage';
import { DocumentUploader, type UploadedFileRow } from '@/components/portal/document-uploader';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { FileSignature } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documents' };

type Doc = {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  storage_path: string | null;
  version: number | null;
  created_at: string;
  size_bytes: number | string | null;
};

const CONTRACT_TYPES = new Set(['contract', 'sow', 'nda', 'amendment', 'msa']);

const STATUS_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral'> = {
  draft: 'neutral',
  sent: 'amber',
  signed: 'emerald',
  countersigned: 'emerald',
  void: 'rose',
};

export default async function DocumentsPage() {
  const ctx = await getPortalContext();
  const allDocs = (
    ctx.organizationId ? ((await getDocumentsForOrg(ctx.organizationId)) as Doc[]) : []
  );

  const contracts = allDocs.filter((d) => CONTRACT_TYPES.has((d.type ?? '').toLowerCase()));

  // Pull org-scoped files for the uploader (latest-only). Admin client reads
  // are fine here -- RLS would also allow it, but we already have the org id.
  const sb = supabaseAdmin();
  const filesData = ctx.organizationId
    ? (
        await sb
          .from('files')
          .select(
            'id, organization_id, engagement_id, name, storage_path, mime_type, size_bytes, version, is_latest, uploaded_by, created_at, deleted_at, parent_id',
          )
          .eq('organization_id', ctx.organizationId)
          .eq('is_latest', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      ).data ?? []
    : [];
  const initialFiles = filesData as unknown as UploadedFileRow[];

  const usageRow = ctx.organizationId
    ? (
        await sb
          .from('org_storage_usage')
          .select('bytes_used, object_count')
          .eq('organization_id', ctx.organizationId)
          .maybeSingle()
      ).data
    : null;
  const initialQuota = {
    bytesUsed: Number(usageRow?.bytes_used ?? 0),
    objectCount: Number(usageRow?.object_count ?? 0),
    quotaBytes: ORG_QUOTA_BYTES,
  };

  return (
    <>
      <Topbar crumbs={[{ label: 'Documents' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Documents</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Files, deliverable artifacts, and signed contracts. One source of truth.
          </p>
        </div>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b]">
              Files
            </h2>
            <span className="text-xs text-[#71717a]">{initialFiles.length} item{initialFiles.length === 1 ? '' : 's'}</span>
          </div>
          <DocumentUploader
            engagementId={null}
            initialFiles={initialFiles}
            initialQuota={initialQuota}
          />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b]">
              Contracts
            </h2>
            <span className="text-xs text-[#71717a]">{contracts.length} item{contracts.length === 1 ? '' : 's'}</span>
          </div>
          {contracts.length === 0 ? (
            <EmptyCard
              icon={<FileSignature className="w-5 h-5 text-[#71717a]" />}
              title="No contracts yet"
              body="MSAs, SOWs, and NDAs will appear here when sent."
            />
          ) : (
            <div className="space-y-2">
              {contracts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <FileSignature className="w-5 h-5 text-[#71717a] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#fafafa] truncate">
                          {c.title}
                        </span>
                        <Badge tone={STATUS_TONE[c.status ?? 'draft'] ?? 'neutral'}>
                          {c.status ?? 'draft'}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#71717a] mt-0.5 capitalize">
                        {c.type ?? 'contract'} · {formatDate(c.created_at)}
                      </div>
                    </div>
                    {c.status === 'sent' ? (
                      <Link href={`/portal/documents/sign/${c.id}`}>
                        <Button size="sm" data-testid="documents-sign-cta">
                          Sign now
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/portal/documents/${c.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function EmptyCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <div className="w-11 h-11 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-3">
          {icon}
        </div>
        <h3 className="font-semibold text-[#fafafa] text-sm">{title}</h3>
        <p className="text-xs text-[#71717a] mt-1.5">{body}</p>
      </CardContent>
    </Card>
  );
}

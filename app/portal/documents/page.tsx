import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { getDocumentsForOrg } from '@/lib/portal/queries';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { FileSignature, FileText, Download, ExternalLink } from 'lucide-react';
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

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

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
  const otherDocs = allDocs.filter((d) => !CONTRACT_TYPES.has((d.type ?? '').toLowerCase()));

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
            <span className="text-xs text-[#71717a]">{otherDocs.length} item{otherDocs.length === 1 ? '' : 's'}</span>
          </div>
          {otherDocs.length === 0 ? (
            <EmptyCard
              icon={<FileText className="w-5 h-5 text-[#71717a]" />}
              title="No files yet"
              body="Project artifacts will land here as deliverables ship."
            />
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
                <div className="md:col-span-5">Filename</div>
                <div className="md:col-span-2">Type</div>
                <div className="md:col-span-1">Size</div>
                <div className="md:col-span-2">Uploaded</div>
                <div className="md:col-span-2 text-right">Actions</div>
              </div>
              {otherDocs.map((d) => (
                <div
                  key={d.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-[#131316]"
                >
                  <div className="md:col-span-5 flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#71717a] shrink-0" />
                    <span className="text-sm font-medium text-[#fafafa] truncate">
                      {d.title}
                    </span>
                  </div>
                  <div className="md:col-span-2 text-xs text-[#a1a1aa] capitalize">
                    {d.type ?? 'file'}
                  </div>
                  <div className="md:col-span-1 text-xs text-[#a1a1aa] tabular-nums">
                    {formatBytes(d.size_bytes !== null ? Number(d.size_bytes) : null)}
                  </div>
                  <div className="md:col-span-2 text-xs text-[#71717a]">
                    {formatDate(d.created_at)}
                  </div>
                  <div className="md:col-span-2 flex md:justify-end">
                    <DocAction doc={d} />
                  </div>
                </div>
              ))}
            </div>
          )}
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
                        <Button size="sm">Sign</Button>
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

function DocAction({ doc }: { doc: Doc }) {
  if (doc.storage_path) {
    return (
      <a
        href={`/api/portal/documents/${doc.id}/download`}
        className="inline-flex items-center gap-1.5 text-xs text-[#22d3ee] hover:text-[#67e8f9]"
      >
        <Download className="w-3.5 h-3.5" /> Download
      </a>
    );
  }
  return (
    <Link
      href={`/portal/documents/${doc.id}`}
      className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa]"
    >
      <ExternalLink className="w-3.5 h-3.5" /> Open
    </Link>
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

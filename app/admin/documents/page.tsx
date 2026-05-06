import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { DocumentsTable, type DocRow } from '@/components/admin/documents-table';
import { NewDocumentModal } from '@/components/admin/new-document-modal';
import type { DocModalEngagement, DocModalOrg } from '@/components/admin/new-document-modal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documents' };

const STATUSES = ['draft', 'shared'] as const;
type StatusFilter = (typeof STATUSES)[number];

type Row = {
  id: string;
  title: string;
  status: string | null;
  created_at: string;
  size_bytes: number | string | null;
  mime_type: string | null;
  uploaded_by: string | null;
  organization_id: string;
  engagement_id: string | null;
  organizations: { id: string; name: string | null } | null;
  engagements: { id: string; title: string | null } | null;
};

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; engagement?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const orgFilter = (params.org ?? '').trim() || undefined;
  const engagementFilter = (params.engagement ?? '').trim() || undefined;
  const status = STATUSES.includes(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : undefined;
  const q = (params.q ?? '').trim();

  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  let docQuery = sb
    .from('documents')
    .select(
      'id, title, status, created_at, size_bytes, mime_type, uploaded_by, organization_id, engagement_id, organizations:organization_id(id, name), engagements:engagement_id(id, title)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (orgFilter) docQuery = docQuery.eq('organization_id', orgFilter);
  if (engagementFilter) docQuery = docQuery.eq('engagement_id', engagementFilter);
  if (status) docQuery = docQuery.eq('status', status);
  if (q) docQuery = docQuery.ilike('title', `%${q}%`);

  const { data: docs } = await docQuery;
  const rows = (docs ?? []) as unknown as Row[];

  const uploaderIds = [...new Set(rows.map((r) => r.uploaded_by).filter(Boolean) as string[])];
  const profileMap = new Map<string, string>();
  if (uploaderIds.length) {
    const { data: profs } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uploaderIds);
    for (const p of profs ?? []) profileMap.set(p.id, p.full_name || p.email);
  }

  const tableRows: DocRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: (r.status as DocRow['status']) ?? 'draft',
    organization_name: r.organizations?.name ?? null,
    engagement_title: r.engagements?.title ?? null,
    uploaded_by_name: r.uploaded_by ? profileMap.get(r.uploaded_by) ?? null : null,
    size_bytes: r.size_bytes !== null ? Number(r.size_bytes) : null,
    mime_type: r.mime_type,
    created_at: r.created_at,
  }));

  const [{ data: orgRows }, { data: engRows }] = await Promise.all([
    sb.from('organizations').select('id, name').order('name', { ascending: true }).limit(500),
    sb
      .from('engagements')
      .select('id, title, organization_id')
      .order('title', { ascending: true })
      .limit(500),
  ]);

  const orgOptions: DocModalOrg[] = (orgRows ?? []).map((o) => ({
    id: o.id as string,
    name: (o.name as string | null) ?? '(unnamed)',
  }));
  const engagementOptions: DocModalEngagement[] = (engRows ?? []).map((e) => ({
    id: e.id as string,
    title: (e.title as string | null) ?? '(untitled)',
    organization_id: (e.organization_id as string | null) ?? null,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Documents' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Documents</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Upload files and share them with clients in their portal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex flex-wrap items-center gap-2" action="/admin/documents">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search filename…"
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:border-[#06b6d4]/60 focus:outline-none"
              />
              <select
                name="org"
                defaultValue={orgFilter ?? ''}
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-xs text-[#fafafa] max-w-[180px]"
              >
                <option value="">All organizations</option>
                {orgOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select
                name="engagement"
                defaultValue={engagementFilter ?? ''}
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-xs text-[#fafafa] max-w-[180px]"
              >
                <option value="">All engagements</option>
                {engagementOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={status ?? ''}
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-xs text-[#fafafa]"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4]"
              >
                Filter
              </button>
            </form>
            <NewDocumentModal organizations={orgOptions} engagements={engagementOptions} />
          </div>
        </div>

        <DocumentsTable rows={tableRows} />
      </div>
    </>
  );
}

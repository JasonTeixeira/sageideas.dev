import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { NewClientModal } from '@/components/admin/new-client-modal';
import { formatCurrency, formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'CRM' };

const STAGES = ['lead', 'qualified', 'proposal', 'active', 'past', 'cold'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_TONE: Record<Stage, string> = {
  lead: 'bg-[#52525b]/15 text-[#a1a1aa] border-[#52525b]/30',
  qualified: 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/30',
  proposal: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  past: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  cold: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

type Org = {
  id: string;
  name: string;
  pipeline_stage: Stage | null;
  annual_value: number | string | null;
  owner_id: string | null;
  updated_at: string | null;
  created_at: string;
};

export default async function AdminCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const params = await searchParams;
  const stage = STAGES.includes(params.stage as Stage) ? (params.stage as Stage) : undefined;
  const q = (params.q ?? '').trim();

  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  let query = sb
    .from('organizations')
    .select('id, name, pipeline_stage, annual_value, owner_id, updated_at, created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(200);
  if (stage) query = query.eq('pipeline_stage', stage);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data: orgs } = await query;
  const orgList = (orgs ?? []) as Org[];

  const ownerIds = [...new Set(orgList.map((o) => o.owner_id).filter(Boolean) as string[])];
  const profileMap = new Map<string, string>();
  if (ownerIds.length) {
    const { data: profs } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ownerIds);
    for (const p of profs ?? []) profileMap.set(p.id, p.full_name || p.email);
  }

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'CRM' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">CRM</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Every organization in the pipeline. Click through to edit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex flex-wrap items-center gap-2" action="/admin/crm">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search organizations…"
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:border-[#06b6d4]/60 focus:outline-none"
              />
              <select
                name="stage"
                defaultValue={stage ?? ''}
                className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-xs text-[#fafafa]"
              >
                <option value="">All stages</option>
                {STAGES.map((s) => (
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
            <NewClientModal />
          </div>
        </div>

        {orgList.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-10 text-center text-sm text-[#a1a1aa]">
            No organizations match. Try clearing filters.
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b] border-b border-[#1f1f23]">
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Stage</div>
              <div className="col-span-2 text-right">Annual value</div>
              <div className="col-span-2">Owner</div>
              <div className="col-span-2">Last activity</div>
            </div>
            <div className="divide-y divide-[#1f1f23]">
              {orgList.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/crm/${o.id}`}
                  className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[#131316] transition-colors"
                >
                  <div className="col-span-4 text-sm font-medium text-[#fafafa] truncate">
                    {o.name}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${
                        STAGE_TONE[o.pipeline_stage ?? 'lead']
                      }`}
                    >
                      {o.pipeline_stage ?? 'lead'}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-[#fafafa] tabular-nums text-right">
                    {o.annual_value ? formatCurrency(Number(o.annual_value)) : '—'}
                  </div>
                  <div className="col-span-2 text-xs text-[#a1a1aa] truncate">
                    {o.owner_id ? profileMap.get(o.owner_id) ?? '—' : '—'}
                  </div>
                  <div className="col-span-2 text-xs text-[#71717a]">
                    {formatRelative(o.updated_at ?? o.created_at)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

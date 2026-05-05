import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { PipelineBoard, type BoardCard, type Stage } from '@/components/admin/pipeline-board';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pipeline' };

type EngRow = {
  id: string;
  title: string;
  pipeline_stage: Stage | null;
  kanban_position: number | null;
  contract_value: number | string | null;
  budget_hours: number | string | null;
  owner_id: string | null;
  priority: string | null;
  tags: string[] | null;
  created_at: string;
  organizations: { name: string | null } | null;
};

export default async function PipelinePage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data: engs } = await sb
    .from('engagements')
    .select(
      'id, title, pipeline_stage, kanban_position, contract_value, budget_hours, owner_id, priority, tags, created_at, organizations(name)',
    )
    .order('kanban_position', { ascending: true });

  const rows = (engs ?? []) as unknown as EngRow[];
  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean) as string[])];
  const ownerMap = new Map<string, string>();
  if (ownerIds.length) {
    const { data: profs } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ownerIds);
    for (const p of profs ?? []) ownerMap.set(p.id, p.full_name || p.email);
  }

  const initial: BoardCard[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    org_name: r.organizations?.name ?? null,
    owner_id: r.owner_id,
    owner_name: r.owner_id ? ownerMap.get(r.owner_id) ?? null : null,
    contract_value: r.contract_value !== null ? Number(r.contract_value) : null,
    budget_hours: r.budget_hours !== null ? Number(r.budget_hours) : null,
    priority: (r.priority ?? 'normal') as BoardCard['priority'],
    tags: r.tags ?? [],
    created_at: r.created_at,
    pipeline_stage: (r.pipeline_stage ?? 'discovery') as Stage,
    kanban_position: r.kanban_position ?? 0,
  }));

  const owners = [...ownerMap.entries()].map(([id, name]) => ({ id, name }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Pipeline' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Pipeline</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Drag engagements between stages. Shift-click cards to multi-select.
          </p>
        </div>
        <PipelineBoard initial={initial} owners={owners} />
      </div>
    </>
  );
}

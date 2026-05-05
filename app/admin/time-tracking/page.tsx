import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { TimeEntriesTable, type TimeEntryRow } from '@/components/admin/time-entries-table';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Time Tracking' };

type RawEntry = {
  id: string;
  user_id: string;
  engagement_id: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean | null;
};

type SearchParams = {
  user_id?: string;
  engagement_id?: string;
  billable?: string;
  from?: string;
  to?: string;
};

export default async function TimeTrackingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { profile } = await requireAdmin();
  const sp = await searchParams;
  const sb = supabaseAdmin();

  let q = sb
    .from('time_entries')
    .select(
      'id, user_id, engagement_id, task_id, description, started_at, ended_at, duration_minutes, billable',
    )
    .order('started_at', { ascending: false })
    .limit(500);
  if (sp.user_id) q = q.eq('user_id', sp.user_id);
  if (sp.engagement_id) q = q.eq('engagement_id', sp.engagement_id);
  if (sp.billable === 'true') q = q.eq('billable', true);
  if (sp.billable === 'false') q = q.eq('billable', false);
  if (sp.from) q = q.gte('started_at', sp.from);
  if (sp.to) q = q.lte('started_at', sp.to);

  const [{ data: rawEntries }, { data: profs }, { data: engs }] = await Promise.all([
    q,
    sb.from('profiles').select('id, full_name, email').order('full_name', { ascending: true }),
    sb
      .from('engagements')
      .select('id, title, organizations(name)')
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);

  const userMap = new Map<string, string>();
  for (const p of profs ?? [])
    userMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8));

  const engMap = new Map<string, { title: string; org: string | null }>();
  type EngRow = { id: string; title: string; organizations: { name: string | null } | null };
  for (const e of (engs ?? []) as unknown as EngRow[]) {
    engMap.set(e.id, { title: e.title, org: e.organizations?.name ?? null });
  }

  const rows: TimeEntryRow[] = ((rawEntries ?? []) as RawEntry[]).map((r) => {
    const eng = r.engagement_id ? engMap.get(r.engagement_id) : null;
    return {
      id: r.id,
      user_id: r.user_id,
      user_name: userMap.get(r.user_id) ?? r.user_id.slice(0, 8),
      engagement_id: r.engagement_id,
      engagement_title: eng?.title ?? null,
      org_name: eng?.org ?? null,
      task_id: r.task_id,
      description: r.description,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_minutes: r.duration_minutes,
      billable: r.billable ?? true,
    };
  });

  const totalMins = rows.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);
  const billableMins = rows
    .filter((r) => r.billable)
    .reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0);

  const userOptions = (profs ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email || p.id.slice(0, 8),
  }));
  type EngOption = { id: string; title: string; organizations: { name: string | null } | null };
  const engOptions = ((engs ?? []) as unknown as EngOption[]).map((e) => ({
    id: e.id,
    label: `${e.title}${e.organizations?.name ? ` — ${e.organizations.name}` : ''}`,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Time Tracking' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Time Tracking</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · {fmtHours(totalMins)} total
              · {fmtHours(billableMins)} billable
            </p>
          </div>
          <Link
            href="/admin/time-tracking/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#06b6d4] px-3.5 py-2 text-sm font-medium text-[#0a0a0c] hover:bg-[#22d3ee] transition-colors"
          >
            New entry
          </Link>
        </div>

        <TimeEntriesTable
          rows={rows}
          users={userOptions}
          engagements={engOptions}
          filters={{
            user_id: sp.user_id ?? '',
            engagement_id: sp.engagement_id ?? '',
            billable: sp.billable ?? '',
            from: sp.from ?? '',
            to: sp.to ?? '',
          }}
        />
      </div>
    </>
  );
}

function fmtHours(mins: number) {
  const h = mins / 60;
  return `${h.toFixed(1)}h`;
}

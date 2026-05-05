import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import {
  WorkloadTable,
  type WorkloadRow,
  type EngBreakdown,
} from '@/components/admin/workload-table';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workload' };

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  app_role: string;
  weekly_capacity_hours: number | null;
};

type TimeEntryRow = {
  user_id: string;
  engagement_id: string | null;
  duration_minutes: number | null;
  started_at: string;
};

type EngRow = { id: string; title: string; owner_id: string | null; pipeline_stage: string | null };
type TaskRow = { assignee_id: string | null; status: string };

function weekRangeUtc(now: Date): { start: Date; end: Date } {
  // Monday 00:00 UTC of current week → next Monday 00:00 UTC
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() + offsetToMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

export default async function WorkloadPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const now = new Date();
  const thisWeek = weekRangeUtc(now);
  const lastWeekStart = new Date(thisWeek.start);
  lastWeekStart.setUTCDate(thisWeek.start.getUTCDate() - 7);
  const lastWeekEnd = new Date(thisWeek.start);

  const [{ data: profsData }, { data: timeData }, { data: engsData }, { data: tasksData }, { data: settingsData }] =
    await Promise.all([
      sb
        .from('profiles')
        .select('id, full_name, email, app_role, weekly_capacity_hours')
        .in('app_role', ['admin', 'collaborator']),
      sb
        .from('time_entries')
        .select('user_id, engagement_id, duration_minutes, started_at')
        .gte('started_at', lastWeekStart.toISOString())
        .lt('started_at', thisWeek.end.toISOString()),
      sb.from('engagements').select('id, title, owner_id, pipeline_stage'),
      sb.from('tasks').select('assignee_id, status'),
      sb.from('studio_settings').select('weekly_capacity_hours').limit(1).maybeSingle(),
    ]);

  const defaultCapacity = Number(settingsData?.weekly_capacity_hours ?? 40);
  const profs = (profsData ?? []) as ProfileRow[];
  const engs = (engsData ?? []) as EngRow[];
  const tasks = (tasksData ?? []) as TaskRow[];
  const entries = (timeData ?? []) as TimeEntryRow[];

  const engById = new Map<string, EngRow>();
  for (const e of engs) engById.set(e.id, e);

  const activeStages = new Set(['discovery', 'proposal', 'contract', 'active', 'review']);
  const activeByOwner = new Map<string, number>();
  for (const e of engs) {
    if (!e.owner_id) continue;
    if (!activeStages.has(e.pipeline_stage ?? 'discovery')) continue;
    activeByOwner.set(e.owner_id, (activeByOwner.get(e.owner_id) ?? 0) + 1);
  }

  const openTasksByUser = new Map<string, number>();
  for (const t of tasks) {
    if (!t.assignee_id) continue;
    if (t.status === 'done' || t.status === 'cancelled') continue;
    openTasksByUser.set(t.assignee_id, (openTasksByUser.get(t.assignee_id) ?? 0) + 1);
  }

  // Hours per user per week, plus engagement breakdown for this week
  const thisWeekMins = new Map<string, number>();
  const lastWeekMins = new Map<string, number>();
  const breakdownMins = new Map<string, Map<string, number>>(); // user -> engagement -> mins

  for (const t of entries) {
    const ts = new Date(t.started_at);
    const mins = Number(t.duration_minutes ?? 0);
    if (ts >= thisWeek.start && ts < thisWeek.end) {
      thisWeekMins.set(t.user_id, (thisWeekMins.get(t.user_id) ?? 0) + mins);
      if (t.engagement_id) {
        let m = breakdownMins.get(t.user_id);
        if (!m) {
          m = new Map();
          breakdownMins.set(t.user_id, m);
        }
        m.set(t.engagement_id, (m.get(t.engagement_id) ?? 0) + mins);
      }
    } else if (ts >= lastWeekStart && ts < lastWeekEnd) {
      lastWeekMins.set(t.user_id, (lastWeekMins.get(t.user_id) ?? 0) + mins);
    }
  }

  const rows: WorkloadRow[] = profs.map((p) => {
    const capacity = p.weekly_capacity_hours != null ? Number(p.weekly_capacity_hours) : defaultCapacity;
    const thisH = (thisWeekMins.get(p.id) ?? 0) / 60;
    const lastH = (lastWeekMins.get(p.id) ?? 0) / 60;
    const utilization = capacity > 0 ? (thisH / capacity) * 100 : 0;
    const bMap = breakdownMins.get(p.id);
    const breakdown: EngBreakdown[] = bMap
      ? [...bMap.entries()]
          .map(([eid, mins]) => ({
            engagement_id: eid,
            title: engById.get(eid)?.title ?? 'Unknown',
            hours: mins / 60,
          }))
          .sort((a, b) => b.hours - a.hours)
      : [];
    return {
      user_id: p.id,
      name: p.full_name || p.email || p.id.slice(0, 8),
      email: p.email,
      active_engagements: activeByOwner.get(p.id) ?? 0,
      open_tasks: openTasksByUser.get(p.id) ?? 0,
      hours_this_week: thisH,
      hours_last_week: lastH,
      capacity,
      utilization_pct: utilization,
      breakdown,
    };
  });

  rows.sort((a, b) => b.utilization_pct - a.utilization_pct);

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Workload' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Workload</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Week of {thisWeek.start.toISOString().slice(0, 10)} — capacity, hours, and assignments
            per team member. Click a row for engagement breakdown.
          </p>
        </div>

        <WorkloadTable rows={rows} />
      </div>
    </>
  );
}

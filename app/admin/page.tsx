import Link from 'next/link';
import { approveProfile } from '@/app/auth/actions';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { timed } from '@/lib/portal/db-timing';
import { AdminTopbar } from '@/components/admin/topbar';
import { formatCurrency, formatRelative } from '@/lib/utils';
import {
  Briefcase,
  ListChecks,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  DollarSign,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type WorkloadRow = {
  assignee_id: string | null;
  status: string;
};

const monthStart = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Briefcase;
}) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
          {label}
        </span>
        <Icon className="w-4 h-4 text-[#06b6d4]" />
      </div>
      <div className="text-2xl font-semibold tracking-tight text-[#fafafa] tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-[#52525b]">{hint}</div>}
    </div>
  );
}

export default async function AdminHomePage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const [
    activeProjectsRes,
    openDelivsRes,
    paidThisMonthRes,
    arRes,
    newLeadsRes,
    activeBudgetRes,
    pendingRes,
    auditRes,
    workloadRes,
    profileMapRes,
  ] = await timed(
    'admin.dashboard.fanout',
    Promise.all([
    sb.from('engagements').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    sb
      .from('deliverables')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'approved')
      .neq('status', 'archived'),
    sb.from('invoices').select('total, paid_at, status').eq('status', 'paid').gte('paid_at', monthStart()),
    sb.from('invoices').select('total, status').in('status', ['sent', 'overdue']),
    sb
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('pipeline_stage', 'lead')
      .gte('created_at', thirtyDaysAgo()),
    sb.from('engagements').select('contract_value').eq('status', 'active'),
    sb
      .from('profiles')
      .select('id, email, full_name, company, role_in_company, created_at')
      .eq('approval_status', 'pending')
      .neq('app_role', 'admin')
      .order('created_at', { ascending: true })
      .limit(20),
    sb
      .from('audit_log')
      .select('id, actor_id, actor_email, action, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    sb
      .from('tasks')
      .select('assignee_id, status')
      .in('status', ['todo', 'in_progress', 'review', 'blocked']),
    sb.from('profiles').select('id, full_name, email'),
  ]),
  );

  const mtdRevenue = (paidThisMonthRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.total ?? 0),
    0,
  );
  const outstandingAr = (arRes.data ?? []).reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  const budgets = (activeBudgetRes.data ?? [])
    .map((e: { contract_value: number | string | null }) => Number(e.contract_value ?? 0))
    .filter((n) => n > 0);
  const avgProjectValue = budgets.length
    ? budgets.reduce((a, b) => a + b, 0) / budgets.length
    : 0;

  const profileMap = new Map(
    ((profileMapRes.data ?? []) as { id: string; full_name: string | null; email: string }[]).map(
      (p) => [p.id, p.full_name || p.email],
    ),
  );

  // Top 5 assignees
  const workload = (workloadRes.data ?? []) as WorkloadRow[];
  const byAssignee = new Map<string, Record<string, number>>();
  for (const r of workload) {
    const k = r.assignee_id ?? 'unassigned';
    const bucket = byAssignee.get(k) ?? {};
    bucket[r.status] = (bucket[r.status] ?? 0) + 1;
    byAssignee.set(k, bucket);
  }
  const workloadRanked = [...byAssignee.entries()]
    .map(([k, v]) => ({
      assigneeId: k,
      name: k === 'unassigned' ? 'Unassigned' : profileMap.get(k) ?? 'Unknown',
      total: Object.values(v).reduce((a, b) => a + b, 0),
      buckets: v,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxTotal = workloadRanked[0]?.total ?? 1;

  const STATUS_COLOR: Record<string, string> = {
    todo: '#52525b',
    in_progress: '#06b6d4',
    review: '#8b5cf6',
    blocked: '#f43f5e',
  };

  const pendingList = pendingRes.data ?? [];
  const audit = (auditRes.data ?? []) as AuditRow[];

  return (
    <>
      <AdminTopbar email={profile.email} fullName={profile.full_name} />
      <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Welcome, {profile.full_name || profile.email.split('@')[0]}.
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Studio at a glance — pipeline, deliverables, money, queue.
          </p>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Active projects"
            value={String(activeProjectsRes.count ?? 0)}
            icon={Briefcase}
          />
          <KpiCard
            label="Open deliverables"
            value={String(openDelivsRes.count ?? 0)}
            icon={ListChecks}
          />
          <KpiCard
            label="MTD revenue"
            value={formatCurrency(mtdRevenue)}
            hint="Invoices paid this month"
            icon={TrendingUp}
          />
          <KpiCard
            label="Outstanding A/R"
            value={formatCurrency(outstandingAr)}
            hint="Sent + overdue"
            icon={AlertTriangle}
          />
          <KpiCard
            label="New leads (30d)"
            value={String(newLeadsRes.count ?? 0)}
            icon={Sparkles}
          />
          <KpiCard
            label="Avg active project"
            value={formatCurrency(Math.round(avgProjectValue))}
            hint="Budget across active engagements"
            icon={DollarSign}
          />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a]">
              Pending approvals
            </h2>
            <div className="text-xs font-mono text-[#52525b]">{pendingList.length} pending</div>
          </div>
          {pendingList.length === 0 ? (
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-6 text-sm text-[#a1a1aa]">
              No pending requests. New signups land here for one-click approval.
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingList.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#fafafa] truncate">
                      {p.full_name || p.email}
                    </div>
                    <div className="text-xs text-[#71717a] truncate">
                      {p.email}
                      {p.company ? ` · ${p.company}` : ''}
                      {p.role_in_company ? ` · ${p.role_in_company}` : ''}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#52525b] mt-1">
                      Requested {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={approveProfile}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-[#06B6D4] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] transition-colors"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={`/api/admin/profile/${p.id}/decision`} method="post">
                      <input type="hidden" name="decision" value="reject" />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-rose-500/40 hover:text-rose-300 transition-colors"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
              Activity stream
            </h2>
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
              {audit.length === 0 ? (
                <div className="p-5 text-sm text-[#a1a1aa]">No activity yet.</div>
              ) : (
                audit.map((a) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#52525b] w-16 shrink-0">
                      {formatRelative(a.created_at)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#fafafa] truncate">
                        <span className="font-medium">{a.actor_email ?? 'system'}</span>
                        <span className="text-[#71717a]"> · {a.action}</span>
                      </div>
                      <div className="text-[10px] text-[#52525b] truncate">
                        {a.entity_type}
                        {a.entity_id ? `:${a.entity_id.slice(0, 8)}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
              Workload (top 5)
            </h2>
            <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 space-y-3">
              {workloadRanked.length === 0 ? (
                <div className="text-sm text-[#a1a1aa]">No open tasks.</div>
              ) : (
                workloadRanked.map((row) => (
                  <div key={row.assigneeId}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs text-[#fafafa] truncate">{row.name}</span>
                      <span className="text-[10px] font-mono text-[#52525b] tabular-nums">
                        {row.total}
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#18181b]">
                      {Object.entries(row.buckets).map(([status, count]) => (
                        <div
                          key={status}
                          title={`${status}: ${count}`}
                          style={{
                            width: `${(count / maxTotal) * 100}%`,
                            backgroundColor: STATUS_COLOR[status] ?? '#52525b',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest text-[#52525b]">
                {Object.entries(STATUS_COLOR).map(([s, c]) => (
                  <span key={s} className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />
                    {s.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/admin/pipeline"
            className="rounded-lg border border-[#27272a] px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors"
          >
            Open pipeline →
          </Link>
          <Link
            href="/admin/crm"
            className="rounded-lg border border-[#27272a] px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors"
          >
            View CRM →
          </Link>
          <Link
            href="/admin/invoices/new"
            className="rounded-lg border border-[#27272a] px-4 py-2 text-xs font-mono uppercase tracking-widest text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors"
          >
            New invoice →
          </Link>
        </div>
      </div>
    </>
  );
}

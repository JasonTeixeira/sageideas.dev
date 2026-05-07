import { notFound } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Progress } from '@/components/portal/ui/progress';
import Link from 'next/link';
import { ProjectTabs } from '@/components/portal/project-tabs';
import { DeliverableDecision } from '@/components/portal/deliverable-decision';
import { DocumentUploader, type UploadedFileRow } from '@/components/portal/document-uploader';
import { ORG_QUOTA_BYTES } from '@/lib/portal/storage';
import {
  loadFormDefinitionForEngagement,
  readAnswers,
} from '@/lib/portal/intake';
import { Button } from '@/components/portal/ui/button';
import { Check, Circle, Clock, FormInput } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Engagement = {
  id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  status: string;
  pipeline_stage: string | null;
  health: string | null;
  contract_value: number | string | null;
  start_date: string | null;
  target_date: string | null;
  service_type: string | null;
  intake: unknown;
  intake_form_id: string | null;
  intake_submitted_at: string | null;
};

type Phase = {
  id: string;
  name: string;
  status: string;
  position: number | null;
};

type Deliverable = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  position: number | null;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
};

type StatusUpdate = {
  id: string;
  summary: string;
  health: string | null;
  blockers: string | null;
  next_steps: string | null;
  created_at: string;
};

const DELIV_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral' | 'violet'> = {
  draft: 'neutral',
  in_review: 'amber',
  review: 'amber',
  submitted: 'cyan',
  approved: 'emerald',
  rejected: 'rose',
  changes_requested: 'rose',
};

const TASK_TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral' | 'violet'> = {
  todo: 'neutral',
  in_progress: 'cyan',
  blocked: 'rose',
  review: 'amber',
  done: 'emerald',
  cancelled: 'neutral',
};

const HEALTH_TONE: Record<string, 'emerald' | 'amber' | 'rose'> = {
  green: 'emerald',
  yellow: 'amber',
  red: 'rose',
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: eng } = await sb
    .from('engagements')
    .select(
      'id, organization_id, title, description, status, pipeline_stage, health, contract_value, start_date, target_date, service_type, intake, intake_form_id, intake_submitted_at',
    )
    .eq('id', id)
    .maybeSingle<Engagement>();

  if (!eng) notFound();
  if (!ctx.isAdmin && eng.organization_id !== ctx.organizationId) notFound();

  const [phasesRes, delivRes, milesRes, tasksRes, statusRes, assigneesRes] =
    await Promise.all([
      sb.from('phases').select('id, name, status, position').eq('engagement_id', id).order('position'),
      sb
        .from('deliverables')
        .select('id, title, description, status, due_date, approved_at, rejection_reason')
        .eq('engagement_id', id)
        .order('created_at', { ascending: false }),
      sb
        .from('project_milestones')
        .select('id, title, description, due_date, status, position')
        .eq('engagement_id', id)
        .order('position', { ascending: true }),
      sb
        .from('tasks')
        .select('id, title, status, priority, due_date, assignee_id')
        .eq('engagement_id', id)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false }),
      sb
        .from('project_status_updates')
        .select('id, summary, health, blockers, next_steps, created_at, visible_to_client')
        .eq('engagement_id', id)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false }),
      sb.from('app_users').select('clerk_id, full_name'),
    ]);

  const phases = (phasesRes.data ?? []) as Phase[];
  const deliverables = (delivRes.data ?? []) as Deliverable[];
  const milestones = (milesRes.data ?? []) as Milestone[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const updates = (statusRes.data ?? []) as StatusUpdate[];
  const assigneeMap = new Map<string, string>();
  for (const u of (assigneesRes.data ?? []) as { clerk_id: string; full_name: string | null }[]) {
    if (u.clerk_id) assigneeMap.set(u.clerk_id, u.full_name ?? '');
  }

  const totalDelivs = deliverables.length;
  const approvedDelivs = deliverables.filter((d) => d.status === 'approved').length;
  const pct = totalDelivs > 0 ? (approvedDelivs / totalDelivs) * 100 : 0;
  const completedPhases = phases.filter((p) => p.status === 'complete').length;

  const stage = eng.pipeline_stage ?? eng.status;

  // 2E.5 — time-tracking visibility flag + weekly buckets.
  let timeTrackingVisible = false;
  let timeWeeks: { week_starting: string; total_minutes: number }[] = [];
  if (eng.organization_id) {
    const { data: orgRow } = await sb
      .from('organizations')
      .select('show_time_tracking')
      .eq('id', eng.organization_id)
      .maybeSingle();
    timeTrackingVisible = !!orgRow?.show_time_tracking;
    if (timeTrackingVisible || ctx.isAdmin) {
      const horizon = new Date();
      horizon.setUTCDate(horizon.getUTCDate() - 12 * 7);
      const { data: entries } = await sb
        .from('time_entries')
        .select('duration_minutes, started_at')
        .eq('engagement_id', id)
        .gte('started_at', horizon.toISOString());
      const buckets = new Map<string, number>();
      for (const r of (entries ?? []) as Array<{
        duration_minutes: number | string | null;
        started_at: string | null;
      }>) {
        if (!r.started_at) continue;
        const d = new Date(r.started_at);
        const utc = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        );
        const day = utc.getUTCDay();
        utc.setUTCDate(utc.getUTCDate() + (day === 0 ? -6 : 1 - day));
        const week = utc.toISOString().slice(0, 10);
        buckets.set(week, (buckets.get(week) ?? 0) + Number(r.duration_minutes ?? 0));
      }
      timeWeeks = Array.from(buckets.entries())
        .map(([week_starting, total_minutes]) => ({ week_starting, total_minutes }))
        .sort((a, b) => a.week_starting.localeCompare(b.week_starting));
    }
  }
  const formatHM = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };
  const totalMinutes = timeWeeks.reduce((s, w) => s + w.total_minutes, 0);
  const showTimeForClient = timeTrackingVisible && !ctx.isAdmin;
  const showTimeForAdmin = ctx.isAdmin;
  const timeSection =
    showTimeForClient || showTimeForAdmin ? (
      <Card>
        <CardContent className="p-5 space-y-3" data-testid="time-summary-section">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-[#fafafa]">Time logged</h3>
            <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
              <span>Total: {formatHM(totalMinutes)}</span>
              {ctx.isAdmin ? (
                <Badge tone={timeTrackingVisible ? 'emerald' : 'neutral'}>
                  {timeTrackingVisible ? 'Visible to client' : 'Hidden from clients'}
                </Badge>
              ) : null}
            </div>
          </div>
          {timeWeeks.length === 0 ? (
            <p
              className="text-xs text-[#71717a]"
              data-testid="time-summary-disabled-message"
            >
              No tracked time yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#1f1f23]">
              {timeWeeks.map((w) => (
                <li
                  key={w.week_starting}
                  className="flex items-center justify-between py-1.5 text-xs"
                  data-testid={`time-summary-week-${w.week_starting}`}
                >
                  <span className="text-[#a1a1aa] tabular-nums">
                    Week of {w.week_starting}
                  </span>
                  <span className="text-[#fafafa] tabular-nums">
                    {formatHM(w.total_minutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    ) : null;

  const overviewPanel = (
    <div className="space-y-6">
      {timeSection}
      <Card>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <Stat label="Stage" value={<Badge tone="cyan">{stage}</Badge>} />
            <Stat
              label="Health"
              value={
                eng.health ? (
                  <Badge tone={HEALTH_TONE[eng.health] ?? 'neutral'}>{eng.health}</Badge>
                ) : (
                  <span className="text-[#71717a]">—</span>
                )
              }
            />
            <Stat
              label="Contract"
              value={
                eng.contract_value
                  ? formatCurrency(Number(eng.contract_value))
                  : '—'
              }
            />
            <Stat label="Start" value={formatDate(eng.start_date)} />
            <Stat label="Target" value={formatDate(eng.target_date)} />
            <Stat
              label="Progress"
              value={`${approvedDelivs}/${totalDelivs} approved`}
            />
          </div>
        </CardContent>
      </Card>

      {phases.length > 0 && (
        <section>
          <h3 className="text-sm font-medium uppercase tracking-wider text-[#52525b] mb-3">
            Pipeline
          </h3>
          <Card>
            <CardContent className="p-5">
              <Progress value={pct} className="mb-5" />
              <ol className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {phases.map((p) => {
                  const Icon =
                    p.status === 'complete'
                      ? Check
                      : p.status === 'in_progress'
                        ? Clock
                        : Circle;
                  const colors: Record<string, string> = {
                    complete: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30',
                    in_progress: 'text-[#06b6d4] bg-[#06b6d4]/10 border-[#06b6d4]/30',
                    pending: 'text-[#52525b] bg-[#18181b] border-[#27272a]',
                    blocked: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30',
                  };
                  return (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#27272a] bg-[#0f0f12]"
                    >
                      <div
                        className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                          colors[p.status] ?? colors.pending
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#fafafa] truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-[#71717a] capitalize mt-0.5">
                          {p.status.replace('_', ' ')}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="text-xs text-[#71717a] mt-4">
                {completedPhases} of {phases.length} phases complete
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );

  const deliverablesPanel =
    deliverables.length === 0 ? (
      <EmptyState text="No deliverables yet." />
    ) : (
      <div className="space-y-2">
        {deliverables.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#fafafa] truncate">{d.title}</div>
                <div className="text-xs text-[#71717a] mt-0.5 line-clamp-2">
                  {d.description ?? ''}
                  {d.due_date && ` · Due ${formatDate(d.due_date)}`}
                </div>
                {d.rejection_reason && (
                  <div className="text-xs text-[#f43f5e] mt-1.5">
                    Rejection note: {d.rejection_reason}
                  </div>
                )}
              </div>
              <Badge tone={DELIV_TONE[d.status] ?? 'neutral'}>
                {d.status.replace('_', ' ')}
              </Badge>
              {(d.status === 'in_review' || d.status === 'review') && (
                <DeliverableDecision deliverableId={d.id} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );

  const milestonesPanel =
    milestones.length === 0 ? (
      <EmptyState text="No milestones scheduled." />
    ) : (
      <Card>
        <CardContent className="p-0">
          <ol className="relative" data-testid="engagement-milestones-list">
            {milestones.map((m, idx) => {
              const colors: Record<string, string> = {
                complete: 'bg-[#10b981]',
                in_progress: 'bg-[#06b6d4]',
                pending: 'bg-[#3f3f46]',
                missed: 'bg-[#f43f5e]',
              };
              return (
                <li
                  key={m.id}
                  className="flex items-start gap-3 px-5 py-4 border-b border-[#1f1f23] last:border-b-0"
                >
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        colors[m.status] ?? colors.pending
                      }`}
                    />
                    {idx < milestones.length - 1 && (
                      <span className="w-px h-8 bg-[#27272a] mt-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#fafafa]">{m.title}</span>
                      <Badge
                        tone={
                          m.status === 'complete'
                            ? 'emerald'
                            : m.status === 'in_progress'
                              ? 'cyan'
                              : m.status === 'missed'
                                ? 'rose'
                                : 'neutral'
                        }
                      >
                        {m.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="text-xs text-[#71717a] mt-1">{m.description}</p>
                    )}
                    <div className="text-xs text-[#71717a] mt-1">
                      {m.due_date ? `Due ${formatDate(m.due_date)}` : 'No date set'}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    );

  const tasksPanel =
    tasks.length === 0 ? (
      <EmptyState text="No tasks yet." />
    ) : (
      <Card>
        <CardContent className="p-0">
          <ul>
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f23] last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#fafafa] truncate">
                    {t.title}
                  </div>
                  <div className="text-xs text-[#71717a] mt-0.5">
                    {t.assignee_id ? assigneeMap.get(t.assignee_id) || 'Assigned' : 'Unassigned'}
                    {t.due_date && ` · Due ${formatDate(t.due_date)}`}
                    {t.priority && ` · ${t.priority}`}
                  </div>
                </div>
                <Badge tone={TASK_TONE[t.status] ?? 'neutral'}>
                  {t.status.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );

  const statusPanel =
    updates.length === 0 ? (
      <EmptyState text="No status updates posted yet." />
    ) : (
      <div className="space-y-3">
        {updates.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {u.health && (
                  <Badge tone={HEALTH_TONE[u.health] ?? 'neutral'}>{u.health}</Badge>
                )}
                <span className="text-xs text-[#71717a]">{formatDate(u.created_at)}</span>
              </div>
              <p className="text-sm text-[#fafafa] whitespace-pre-wrap">{u.summary}</p>
              {u.blockers && (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wider text-[#52525b] mb-1">
                    Blockers
                  </div>
                  <p className="text-sm text-[#a1a1aa] whitespace-pre-wrap">{u.blockers}</p>
                </div>
              )}
              {u.next_steps && (
                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wider text-[#52525b] mb-1">
                    Next steps
                  </div>
                  <p className="text-sm text-[#a1a1aa] whitespace-pre-wrap">
                    {u.next_steps}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );

  const projectOrgId = eng.organization_id;
  const filesData = projectOrgId
    ? (
        await sb
          .from('files')
          .select(
            'id, organization_id, engagement_id, name, storage_path, mime_type, size_bytes, version, is_latest, uploaded_by, created_at, deleted_at, parent_id',
          )
          .eq('organization_id', projectOrgId)
          .eq('engagement_id', id)
          .eq('is_latest', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      ).data ?? []
    : [];
  const projectFiles = filesData as unknown as UploadedFileRow[];

  const projectUsageRow = projectOrgId
    ? (
        await sb
          .from('org_storage_usage')
          .select('bytes_used, object_count')
          .eq('organization_id', projectOrgId)
          .maybeSingle()
      ).data
    : null;
  const projectQuota = {
    bytesUsed: Number(projectUsageRow?.bytes_used ?? 0),
    objectCount: Number(projectUsageRow?.object_count ?? 0),
    quotaBytes: ORG_QUOTA_BYTES,
  };

  const filesPanel = (
    <DocumentUploader
      engagementId={id}
      initialFiles={projectFiles}
      initialQuota={projectQuota}
      testIdSuffix="project"
    />
  );

  // Kickoff panel — show submitted answers (read-only) or a CTA to fill in.
  const intakeDef = await loadFormDefinitionForEngagement({
    engagement: {
      id: eng.id,
      intake_form_id: eng.intake_form_id,
      service_type: eng.service_type,
    },
    sb,
  });
  const intakeAnswers = readAnswers(eng.intake);
  const kickoffPanel = eng.intake_submitted_at && intakeDef ? (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div>
          <h3 className="text-sm font-medium text-[#fafafa]">{intakeDef.title}</h3>
          <p className="text-xs text-[#71717a]">
            Submitted {formatDate(eng.intake_submitted_at)}
          </p>
        </div>
        <div
          className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]"
          data-testid="kickoff-answers"
        >
          {intakeDef.schema.fields.map((f) => (
            <div key={f.id} className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-[#52525b]">
                {f.label}
              </div>
              <div className="mt-1 text-sm text-[#fafafa] whitespace-pre-wrap">
                {intakeAnswers[f.id] || '—'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="p-8 text-center space-y-4">
        <FormInput className="w-7 h-7 text-[#52525b] mx-auto" />
        <div>
          <h3 className="text-sm font-semibold text-[#fafafa]">Kickoff intake pending</h3>
          <p className="text-xs text-[#71717a] mt-1">
            A few quick answers help us tailor the work to your goals.
          </p>
        </div>
        <Link href={`/portal/intake/${eng.id}`}>
          <Button size="sm">Complete kickoff form</Button>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Dashboard', href: '/portal' },
          { label: 'Projects', href: '/portal/projects' },
          { label: eng.title },
        ]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6">
        <header>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              {eng.title}
            </h1>
            <Badge tone="cyan">{stage}</Badge>
            {eng.health && (
              <Badge tone={HEALTH_TONE[eng.health] ?? 'neutral'}>{eng.health}</Badge>
            )}
          </div>
          {eng.description && (
            <p className="text-sm text-[#a1a1aa] max-w-2xl whitespace-pre-wrap">
              {eng.description}
            </p>
          )}
        </header>

        <ProjectTabs
          initial="overview"
          panels={{
            overview: overviewPanel,
            deliverables: deliverablesPanel,
            milestones: milestonesPanel,
            tasks: tasksPanel,
            status: statusPanel,
            files: filesPanel,
            kickoff: kickoffPanel,
          }}
        />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#52525b] mb-1">
        {label}
      </div>
      <div className="text-sm text-[#fafafa]">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-[#71717a]">
        {text}
      </CardContent>
    </Card>
  );
}

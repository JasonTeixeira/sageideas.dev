import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import {
  Briefcase,
  CheckCircle2,
  Receipt,
  Calendar as CalendarIcon,
  ArrowRight,
  Clock,
  MessageSquare,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate, formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard · Sage Ideas' };

type Engagement = {
  id: string;
  title: string;
  status: string;
  pipeline_stage: string | null;
  organization_id: string | null;
  service_type: string | null;
  intake_form_id: string | null;
  intake_submitted_at: string | null;
};

type Deliverable = {
  id: string;
  title: string;
  status: string;
  engagement_id: string | null;
};

type Invoice = {
  id: string;
  status: string;
  total: number | string | null;
  amount_due: number | string | null;
  due_date: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  visible_to_client: boolean | null;
};

type Milestone = {
  id: string;
  engagement_id: string;
  title: string;
  due_date: string | null;
  status: string;
};

type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  actor_email: string | null;
  engagement_id: string | null;
  created_at: string;
};

export default async function PortalDashboard() {
  const ctx = await getPortalContext();
  const orgId = ctx.organizationId;
  const sb = supabaseAdmin();

  let engagements: Engagement[] = [];
  let deliverables: Deliverable[] = [];
  let invoices: Invoice[] = [];
  let upcomingEvents: CalendarEvent[] = [];
  let milestones: Milestone[] = [];
  let activity: AuditEntry[] = [];

  if (orgId) {
    const { data: engs } = await sb
      .from('engagements')
      .select(
        'id, title, status, pipeline_stage, organization_id, service_type, intake_form_id, intake_submitted_at',
      )
      .eq('organization_id', orgId);
    engagements = (engs ?? []) as Engagement[];
  }

  const engagementIds = engagements.map((e) => e.id);

  if (engagementIds.length > 0 && orgId) {
    const [delivRes, invRes, eventRes, milestoneRes] = await Promise.all([
      sb
        .from('deliverables')
        .select('id, title, status, engagement_id')
        .in('engagement_id', engagementIds),
      sb
        .from('invoices')
        .select('id, status, total, amount_due, due_date')
        .eq('organization_id', orgId),
      sb
        .from('calendar_events')
        .select('id, title, starts_at, ends_at, visible_to_client')
        .in('engagement_id', engagementIds)
        .eq('visible_to_client', true)
        .gte('starts_at', new Date().toISOString())
        .lte(
          'starts_at',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('starts_at', { ascending: true }),
      sb
        .from('project_milestones')
        .select('id, engagement_id, title, due_date, status')
        .in('engagement_id', engagementIds)
        .neq('status', 'complete')
        .order('due_date', { ascending: true })
        .limit(3),
    ]);

    deliverables = delivRes.data ?? [];
    invoices = invRes.data ?? [];
    upcomingEvents = eventRes.data ?? [];
    milestones = milestoneRes.data ?? [];

    const { data: aud } = await sb
      .from('audit_log')
      .select('id, action, entity_type, actor_email, engagement_id, created_at')
      .in('engagement_id', engagementIds)
      .order('created_at', { ascending: false })
      .limit(10);
    activity = aud ?? [];
  }

  const activeProjects = engagements.filter((e) =>
    ['active', 'discovery', 'review'].includes(e.status),
  ).length;
  const openDeliverables = deliverables.filter(
    (d) => d.status !== 'approved' && d.status !== 'closed',
  ).length;
  // "Pending Invoices" KPI sums amount_due across non-terminal invoice statuses.
  const pendingInvoices = invoices.filter((i) =>
    ['open', 'sent', 'due', 'past_due'].includes(i.status),
  );
  const openInvoiceTotal = pendingInvoices.reduce(
    (sum, i) => sum + Number(i.amount_due ?? 0),
    0,
  );

  const firstOpenInvoice = pendingInvoices[0];
  const firstReviewDeliverable = deliverables.find(
    (d) => d.status === 'review' || d.status === 'in_review',
  );
  const intakeNeeded = engagements.find(
    (e) =>
      !e.intake_submitted_at &&
      ['active', 'discovery', 'review'].includes(e.status) &&
      (e.intake_form_id != null || e.service_type != null),
  );

  return (
    <>
      <Topbar crumbs={[{ label: 'Dashboard' }]} />

      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Welcome back
            {ctx.user.full_name ? `, ${ctx.user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Live status across your engagements. No fluff.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<Briefcase className="w-4 h-4" />}
            label="Active Projects"
            value={String(activeProjects)}
            tone="cyan"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Open Deliverables"
            value={String(openDeliverables)}
            tone="violet"
          />
          <KpiCard
            icon={<Receipt className="w-4 h-4" />}
            label="Pending Invoices"
            value={String(pendingInvoices.length)}
            sub={openInvoiceTotal > 0 ? formatCurrency(openInvoiceTotal) : undefined}
            tone="amber"
          />
          <KpiCard
            icon={<CalendarIcon className="w-4 h-4" />}
            label="Upcoming · 7d"
            value={String(upcomingEvents.length)}
            tone="emerald"
          />
        </div>

        {intakeNeeded ? (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
            data-testid="intake-cta-dashboard"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">
                Kickoff intake needed for {intakeNeeded.title}
              </p>
              <p className="text-xs text-amber-300/80">
                A few quick answers so we can hit the ground running.
              </p>
            </div>
            <Link href={`/portal/intake/${intakeNeeded.id}`}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-100"
              >
                Complete kickoff form →
              </button>
            </Link>
          </div>
        ) : null}

        {(engagements.length > 0 || firstOpenInvoice || firstReviewDeliverable) && (
          <div className="flex flex-wrap gap-2">
            <QuickAction
              href="/portal/messages"
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              label="Message Sage"
            />
            {firstReviewDeliverable && (
              <QuickAction
                href={`/portal/projects/${firstReviewDeliverable.engagement_id}?tab=deliverables`}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="View latest deliverable"
              />
            )}
            {firstOpenInvoice && (
              <QuickAction
                href="/portal/invoices"
                icon={<CreditCard className="w-3.5 h-3.5" />}
                label="Pay open invoice"
              />
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b] mb-3">
              What&apos;s next
            </h2>
            <Card>
              <CardContent className="p-0">
                {milestones.length === 0 ? (
                  <div className="p-6 text-sm text-[#71717a]">
                    No upcoming milestones. Once Sage scopes your first phase, dates
                    land here.
                  </div>
                ) : (
                  <ul>
                    {milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1f1f23] last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/portal/projects/${m.engagement_id}?tab=milestones`}
                            className="text-sm font-medium text-[#fafafa] truncate hover:text-[#06b6d4]"
                          >
                            {m.title}
                          </Link>
                          <div className="text-xs text-[#71717a] mt-0.5">
                            {m.due_date ? `Due ${formatDate(m.due_date)}` : 'No date'} ·{' '}
                            <span className="capitalize">
                              {m.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#52525b]" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b] mb-3">
              Recent activity
            </h2>
            <Card>
              <CardContent className="p-0">
                {activity.length === 0 ? (
                  <div className="p-6 text-sm text-[#71717a]">
                    Nothing logged yet. Activity shows up here as work moves.
                  </div>
                ) : (
                  <ul>
                    {activity.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 px-4 py-3 border-b border-[#1f1f23] last:border-b-0"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#52525b] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-[#fafafa] truncate">
                            <span className="text-[#a1a1aa]">
                              {a.actor_email ?? 'system'}
                            </span>{' '}
                            <span className="text-[#71717a]">{a.action}</span>{' '}
                            <span className="text-[#a1a1aa]">{a.entity_type}</span>
                          </div>
                          <div className="text-xs text-[#71717a] mt-0.5">
                            {formatRelative(a.created_at)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {upcomingEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#52525b] mb-3">
              Upcoming this week
            </h2>
            <Card>
              <CardContent className="p-0">
                <ul>
                  {upcomingEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1f1f23] last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#fafafa] truncate">
                          {ev.title}
                        </div>
                        <div className="text-xs text-[#71717a] mt-0.5">
                          {new Date(ev.starts_at).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <Badge tone="cyan">meeting</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: 'cyan' | 'violet' | 'amber' | 'emerald';
}) {
  const toneClass: Record<string, string> = {
    cyan: 'text-[#06b6d4] bg-[#06b6d4]/10 border-[#06b6d4]/30',
    violet: 'text-[#8b5cf6] bg-[#8b5cf6]/10 border-[#8b5cf6]/30',
    amber: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30',
    emerald: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center ${toneClass[tone]}`}
          >
            {icon}
          </div>
          <span className="text-xs uppercase tracking-wider text-[#71717a]">
            {label}
          </span>
        </div>
        <div className="text-2xl font-semibold text-[#fafafa] tabular-nums">
          {value}
        </div>
        {sub && <div className="text-xs text-[#a1a1aa] mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#0f0f12] text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

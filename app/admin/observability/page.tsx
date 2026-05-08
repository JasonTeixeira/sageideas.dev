import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { ObservabilityCharts } from '@/components/admin/observability-charts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Observability', robots: { index: false, follow: false } };

type PerfRow = {
  occurred_at: string;
  metric_name: string;
  metric_value: number;
  rating: string | null;
};

type ErrorRow = {
  id: string;
  occurred_at: string;
  url: string | null;
  message: string;
  severity: string | null;
};

type Range = '24h' | '7d' | '30d';

const RANGE_HOURS: Record<Range, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

function bucketByDay(rows: PerfRow[], metric: string): { day: string; p75: number }[] {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    if (r.metric_name !== metric) continue;
    const day = (r.occurred_at ?? '').slice(0, 10);
    if (!day) continue;
    const arr = map.get(day) ?? [];
    arr.push(Number(r.metric_value));
    map.set(day, arr);
  }
  return Array.from(map.entries())
    .map(([day, values]) => ({ day, p75: p75(values) ?? 0 }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = sp.range === '7d' || sp.range === '30d' ? sp.range : '24h';
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const horizon = new Date(Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000).toISOString();

  const [{ data: perfRowsData }, { data: errorRowsData }] = await Promise.all([
    sb
      .from('performance_events')
      .select('occurred_at, metric_name, metric_value, rating')
      .gte('occurred_at', horizon)
      .order('occurred_at', { ascending: true })
      .limit(5000),
    sb
      .from('error_events')
      .select('id, occurred_at, url, message, severity')
      .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(200),
  ]);

  const perfRows = (perfRowsData ?? []) as PerfRow[];
  const errorRows = (errorRowsData ?? []) as ErrorRow[];

  const lcpValues = perfRows.filter((r) => r.metric_name === 'LCP').map((r) => Number(r.metric_value));
  const inpValues = perfRows.filter((r) => r.metric_name === 'INP').map((r) => Number(r.metric_value));
  const clsValues = perfRows.filter((r) => r.metric_name === 'CLS').map((r) => Number(r.metric_value));

  const lcpP75 = p75(lcpValues);
  const inpP75 = p75(inpValues);
  const clsP75 = p75(clsValues);

  const lcpDaily = bucketByDay(perfRows, 'LCP');
  const inpDaily = bucketByDay(perfRows, 'INP');
  const clsDaily = bucketByDay(perfRows, 'CLS');

  // Top error by message (last 24h).
  const errorCounts = new Map<string, { count: number; sample: ErrorRow }>();
  for (const e of errorRows) {
    const key = (e.message ?? '').slice(0, 200);
    const existing = errorCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      errorCounts.set(key, { count: 1, sample: e });
    }
  }
  const topErrors = Array.from(errorCounts.entries())
    .map(([msg, info]) => ({ message: msg, count: info.count, sample: info.sample }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalSamples = perfRows.length;
  const errorRate = totalSamples > 0 ? errorRows.length / totalSamples : 0;

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Observability' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div
        className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6"
        data-testid="admin-observability"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              Observability
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Real-user metrics, error rate, and SLO posture.
            </p>
          </div>
          <RangeTabs current={range} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SloCard
            label="LCP p75"
            value={lcpP75 == null ? '—' : `${(lcpP75 / 1000).toFixed(2)} s`}
            ok={lcpP75 == null || lcpP75 <= 2500}
            target="≤ 2.5s"
            testid="slo-lcp"
          />
          <SloCard
            label="INP p75"
            value={inpP75 == null ? '—' : `${Math.round(inpP75)} ms`}
            ok={inpP75 == null || inpP75 <= 200}
            target="≤ 200 ms"
            testid="slo-inp"
          />
          <SloCard
            label="Error rate (24h)"
            value={`${(errorRate * 100).toFixed(2)}%`}
            ok={errorRate < 0.05}
            target="< 5%"
            testid="slo-error-rate"
          />
        </div>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-medium text-[#fafafa] mb-3">
              Web vitals trend ({range})
            </h2>
            <ObservabilityCharts
              lcp={lcpDaily}
              inp={inpDaily}
              cls={clsDaily}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-medium text-[#fafafa]">Top errors (24h)</h2>
              <span className="text-xs text-[#71717a]">
                CLS p75: {clsP75 != null ? clsP75.toFixed(3) : '—'} · {totalSamples}{' '}
                vital samples
              </span>
            </div>
            {topErrors.length === 0 ? (
              <p className="text-xs text-[#71717a]" data-testid="observability-no-errors">
                No errors logged in the last 24 hours.
              </p>
            ) : (
              <div className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]">
                {topErrors.map((e, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-xs"
                    data-testid="observability-error-row"
                  >
                    <div className="col-span-1">
                      <Badge tone={e.sample.severity === 'warning' ? 'amber' : 'rose'}>
                        {e.sample.severity ?? 'error'}
                      </Badge>
                    </div>
                    <div className="col-span-3 text-[#a1a1aa] truncate">
                      {e.sample.url ?? '—'}
                    </div>
                    <div className="col-span-7 text-[#fafafa] truncate">
                      {e.message}
                    </div>
                    <div className="col-span-1 text-right tabular-nums text-[#fafafa]">
                      {e.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SloCard({
  label,
  value,
  ok,
  target,
  testid,
}: {
  label: string;
  value: string;
  ok: boolean;
  target: string;
  testid: string;
}) {
  return (
    <Card>
      <CardContent className="p-5" data-testid={testid}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
          <span className="text-[10px] uppercase tracking-wider text-[#52525b]">
            {label}
          </span>
        </div>
        <div className="text-2xl font-semibold text-[#fafafa] tabular-nums">{value}</div>
        <div className="text-xs text-[#71717a] mt-1">target {target}</div>
      </CardContent>
    </Card>
  );
}

function RangeTabs({ current }: { current: Range }) {
  const tabs: Range[] = ['24h', '7d', '30d'];
  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-[#27272a] bg-[#0f0f12] p-0.5"
      role="tablist"
    >
      {tabs.map((t) => (
        <a
          key={t}
          href={`/admin/observability?range=${t}`}
          aria-selected={current === t}
          role="tab"
          className={`px-2.5 py-1 text-xs rounded ${
            current === t
              ? 'bg-[#06b6d4]/15 text-[#67e8f9]'
              : 'text-[#a1a1aa] hover:text-[#fafafa]'
          }`}
        >
          {t}
        </a>
      ))}
    </div>
  );
}

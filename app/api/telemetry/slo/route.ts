import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { structuredLog } from '@/lib/observability/structured-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const sb = supabaseAdmin();
  const horizon = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const [lcpResult, errorResult, perfResult] = await Promise.all([
      sb
        .from('performance_events')
        .select('metric_value')
        .gte('occurred_at', horizon)
        .eq('metric_name', 'LCP'),
      sb
        .from('error_events')
        .select('id')
        .gte('occurred_at', horizon)
        .eq('severity', 'error'),
      sb
        .from('performance_events')
        .select('id', { count: 'exact', head: true })
        .gte('occurred_at', horizon),
    ]);
    if (lcpResult.error || errorResult.error || perfResult.error) {
      throw new Error('telemetry_query_failed');
    }
    const lcpRows = lcpResult.data;
    const errs = errorResult.data;
    const lcpValues = (lcpRows ?? []).map((r) => Number((r as { metric_value: number }).metric_value));
    const lcpP75 = p75(lcpValues);
    const errorCount = (errs ?? []).length;
    const totalSamples = perfResult.count ?? 0;
    const errorSignalRatio = totalSamples > 0 ? errorCount / totalSamples : null;
    return NextResponse.json({
      status: 'available',
      lcp_p75_ms: lcpP75,
      lcp_p75_ok: lcpP75 == null ? null : lcpP75 <= 2500,
      error_count_1h: errorCount,
      error_rate_1h: errorSignalRatio,
      error_rate_ok: errorSignalRatio == null ? null : errorSignalRatio < 0.05,
      error_signal_ratio: errorSignalRatio,
      error_signal_ratio_method: 'error_events_per_vital_sample',
      samples_1h: totalSamples,
    });
  } catch {
    structuredLog('error', 'observability_unavailable', { signal: 'slo_query' });
    return NextResponse.json(
      {
        status: 'unknown',
        error: 'observability_unavailable',
        lcp_p75_ms: null,
        lcp_p75_ok: null,
        error_count_1h: null,
        error_rate_1h: null,
        error_rate_ok: null,
        samples_1h: 0,
      },
      { status: 503 },
    );
  }
}

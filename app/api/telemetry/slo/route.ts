import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)] ?? null;
}

export async function GET() {
  const sb = supabaseAdmin();
  const horizon = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const [{ data: lcpRows }, { data: errs }, { data: perfCount }] = await Promise.all([
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
    const lcpValues = (lcpRows ?? []).map((r) => Number((r as { metric_value: number }).metric_value));
    const lcpP75 = p75(lcpValues);
    const errorCount = (errs ?? []).length;
    const totalSamples = (perfCount as unknown as { count?: number } | null)?.count ?? 0;
    const errorRate = totalSamples > 0 ? errorCount / totalSamples : 0;
    return NextResponse.json({
      lcp_p75_ms: lcpP75,
      lcp_p75_ok: lcpP75 == null || lcpP75 <= 2500,
      error_count_1h: errorCount,
      error_rate_1h: errorRate,
      error_rate_ok: errorRate < 0.05,
      samples_1h: totalSamples,
    });
  } catch (err) {
    console.warn('[telemetry/slo]', err);
    return NextResponse.json(
      { lcp_p75_ok: true, error_rate_ok: true, samples_1h: 0 },
      { status: 200 },
    );
  }
}

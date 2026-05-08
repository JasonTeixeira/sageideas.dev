'use client';

import dynamic from 'next/dynamic';

const LineChartCard = dynamic(() => import('./line-chart-card').then((m) => m.LineChartCard), {
  ssr: false,
  loading: () => (
    <div className="h-[180px] rounded-md border border-[#27272a] bg-[#0a0a0d]" />
  ),
});

type Series = { day: string; p75: number }[];

export function ObservabilityCharts({
  lcp,
  inp,
  cls,
}: {
  lcp: Series;
  inp: Series;
  cls: Series;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <LineChartCard title="LCP p75 (ms)" data={lcp} stroke="#06b6d4" />
      <LineChartCard title="INP p75 (ms)" data={inp} stroke="#a78bfa" />
      <LineChartCard title="CLS p75" data={cls} stroke="#f59e0b" decimals={3} />
    </div>
  );
}

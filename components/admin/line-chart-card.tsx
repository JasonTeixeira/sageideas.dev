'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type Point = { day: string; p75: number };

export function LineChartCard({
  title,
  data,
  stroke,
  decimals = 0,
}: {
  title: string;
  data: Point[];
  stroke: string;
  decimals?: number;
}) {
  const chartData = data.map((d) => ({
    day: d.day.slice(5),
    value: Number(d.p75.toFixed(decimals)),
  }));
  return (
    <div className="rounded-md border border-[#27272a] bg-[#0a0a0d] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[#52525b] mb-1">
        {title}
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f0f12',
                border: '1px solid #27272a',
                borderRadius: 6,
                color: '#fafafa',
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

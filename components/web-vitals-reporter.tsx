'use client';

import { useEffect } from 'react';

type Metric = {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
};

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating ?? null,
    navigation_type: metric.navigationType ?? null,
    url: typeof window !== 'undefined' ? window.location.pathname : null,
    release: process.env.NEXT_PUBLIC_RELEASE ?? null,
  });
  // Prefer sendBeacon (best-effort, fire-and-forget; survives unloads).
  try {
    if (navigator && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry/perf', blob);
      return;
    }
  } catch {
    // fall through
  }
  void fetch('/api/telemetry/perf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const wv = await import('web-vitals');
        if (cancelled) return;
        const handler = (m: Metric) => send(m);
        wv.onCLS(handler);
        wv.onFCP(handler);
        wv.onINP(handler);
        wv.onLCP(handler);
        wv.onTTFB(handler);
      } catch {
        // web-vitals not available — silent no-op.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

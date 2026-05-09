'use client';

import { useEffect } from 'react';

type ErrorPayload = {
  message: string;
  stack?: string | null;
  digest?: string | null;
  severity?: 'error' | 'warning' | 'info';
  url?: string | null;
  release?: string | null;
};

function reportError(payload: ErrorPayload) {
  const body = JSON.stringify({
    severity: payload.severity ?? 'error',
    message: payload.message.slice(0, 4000),
    stack: payload.stack?.slice(0, 8000) ?? null,
    digest: payload.digest ?? null,
    url:
      payload.url ??
      (typeof window !== 'undefined' ? window.location.pathname : null),
    release: payload.release ?? process.env.NEXT_PUBLIC_RELEASE ?? null,
  });
  try {
    if (navigator && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry/error', blob);
      return;
    }
  } catch {
    // fall through
  }
  void fetch('/api/telemetry/error', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function ClientErrorReporter() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      reportError({
        message: e.message || 'window.error',
        stack: e.error?.stack ?? null,
        severity: 'error',
      });
    }
    function onUnhandled(e: PromiseRejectionEvent) {
      const reason = e.reason as { message?: string; stack?: string } | undefined;
      reportError({
        message: reason?.message ?? String(e.reason ?? 'unhandledrejection'),
        stack: reason?.stack ?? null,
        severity: 'error',
      });
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);
  return null;
}

// Re-export the helper so error boundaries can trigger an explicit report.
export { reportError };

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/portal/ui/button';

export function PayRedirector({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoiceId }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !json.url) {
          if (!cancelled) {
            setError(json.error ?? 'Could not start checkout');
            setBusy(false);
          }
          return;
        }
        if (!cancelled) window.location.href = json.url;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Network error');
          setBusy(false);
        }
      }
    }
    void go();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#f87171]">{error}</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" disabled={busy}>
      {busy ? 'Redirecting…' : 'Continue to Stripe'}
    </Button>
  );
}

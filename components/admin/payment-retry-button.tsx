'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';

export function PaymentRetryButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/payments/${eventId}/retry`, { method: 'POST' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Retry failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-[10px] text-rose-300 truncate max-w-[120px]" title={error}>
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => void retry()}
        disabled={pending}
        data-testid="payments-retry-btn"
        className="inline-flex items-center gap-1 rounded-md border border-[#3f3f46] bg-[#18181b] px-2 py-1 text-[10px] text-[#fafafa] hover:bg-[#27272a] disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Retry
      </button>
    </div>
  );
}

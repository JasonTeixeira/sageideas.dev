'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Card, CardContent } from '@/components/portal/ui/card';

export type UpcomingBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  meeting_kind: string;
  status: string;
};

function fmtRange(starts: string, ends: string): string {
  const s = new Date(starts);
  const e = new Date(ends);
  const d = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(s);
  const t = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${d} · ${t.format(s)} – ${t.format(e)}`;
}

export function BookingList({ bookings }: { bookings: UpcomingBooking[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent
          className="p-6 text-sm text-[#a1a1aa]"
          data-testid="bookings-empty"
        >
          You don&apos;t have any upcoming bookings.
        </CardContent>
      </Card>
    );
  }

  async function cancel(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/portal/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Cancel failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-2" data-testid="bookings-list">
      {error ? (
        <div
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          data-testid="booking-cancel-error"
        >
          {error}
        </div>
      ) : null}
      {bookings.map((b) => {
        const isPending = pendingId === b.id;
        const isCancelled = b.status === 'cancelled';
        return (
          <div
            key={b.id}
            data-testid="booking-row"
            data-booking-id={b.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#27272a] bg-[#0a0a0d] px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-sm text-[#fafafa]">
                {fmtRange(b.starts_at, b.ends_at)}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[#71717a]">
                {b.meeting_kind}
                {isCancelled ? ' · cancelled' : ''}
              </div>
            </div>
            {!isCancelled ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void cancel(b.id)}
                disabled={isPending}
                data-testid="booking-cancel-btn"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span className="ml-1.5">Cancel</span>
              </Button>
            ) : (
              <span
                className="text-[10px] uppercase tracking-wider text-[#71717a]"
                data-testid="booking-cancelled-badge"
              >
                Cancelled
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

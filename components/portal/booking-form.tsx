'use client';

import { useMemo, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Card, CardContent } from '@/components/portal/ui/card';
import { cn } from '@/lib/utils';

export type EngagementOption = { id: string; title: string };
type Slot = { startsAt: string; endsAt: string; timezone: string };

const MEETING_KINDS = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'review', label: 'Review' },
  { value: 'status', label: 'Status' },
  { value: 'adhoc', label: 'Ad-hoc' },
] as const;

type Confirmed = {
  id: string;
  starts_at: string;
  ends_at: string;
  meeting_kind: string;
  ics_uid: string;
};

function fmtSlotLabel(iso: string, studioTz: string): string {
  const d = new Date(iso);
  const localFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const studioFmt = new Intl.DateTimeFormat(undefined, {
    timeZone: studioTz,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${localFmt.format(d)} (${studioFmt.format(d)})`;
}

function dayBucket(iso: string, studioTz: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, {
    timeZone: studioTz,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return fmt.format(new Date(iso));
}

export function BookingForm({
  engagements,
  slots,
}: {
  engagements: EngagementOption[];
  slots: Slot[];
}) {
  const [engagementId, setEngagementId] = useState<string>(engagements[0]?.id ?? '');
  const [meetingKind, setMeetingKind] = useState<(typeof MEETING_KINDS)[number]['value']>('kickoff');
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const studioTz = slots[0]?.timezone ?? 'America/New_York';

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = dayBucket(s.startsAt, studioTz);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots, studioTz]);

  async function submit() {
    if (!pickedSlot) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          engagement_id: engagementId || null,
          meeting_kind: meetingKind,
          starts_at: pickedSlot.startsAt,
          ends_at: pickedSlot.endsAt,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        booking?: Confirmed;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.booking) {
        throw new Error(json.error ?? 'Booking failed');
      }
      setConfirmed(json.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4" data-testid="booking-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#fafafa]">Meeting booked</h2>
              <p className="text-xs text-[#a1a1aa]">
                {fmtSlotLabel(confirmed.starts_at, studioTz)} ·{' '}
                <span className="capitalize">{confirmed.meeting_kind}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/portal/bookings/${confirmed.id}/ics`}
              data-testid="booking-ics-download"
            >
              <Button size="sm" variant="outline">
                Add to calendar
              </Button>
            </a>
            <Button
              size="sm"
              onClick={() => {
                setConfirmed(null);
                setPickedSlot(null);
              }}
            >
              Book another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6 space-y-4">
          {engagements.length > 0 ? (
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
                Engagement
              </span>
              <select
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
                data-testid="booking-engagement-picker"
              >
                {engagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
              Meeting type
            </span>
            <select
              value={meetingKind}
              onChange={(e) =>
                setMeetingKind(e.target.value as (typeof MEETING_KINDS)[number]['value'])
              }
              className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
              data-testid="booking-meeting-kind"
            >
              {MEETING_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-[#fafafa] mb-3">Pick a slot</h3>
          {grouped.length === 0 ? (
            <p className="text-xs text-[#71717a]">
              No slots available in the next 14 days.
            </p>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto">
              {grouped.map(([day, daySlots]) => (
                <div key={day}>
                  <div className="text-[10px] uppercase tracking-wider text-[#52525b] mb-2">
                    {day}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {daySlots.map((s) => {
                      const selected = pickedSlot?.startsAt === s.startsAt;
                      return (
                        <button
                          key={s.startsAt}
                          type="button"
                          onClick={() => setPickedSlot(s)}
                          data-testid={`booking-slot-${s.startsAt}`}
                          aria-pressed={selected}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-xs transition-colors text-left',
                            selected
                              ? 'border-[#06b6d4] bg-[#06b6d4]/15 text-[#fafafa]'
                              : 'border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] hover:border-[#52525b] hover:text-[#fafafa]',
                          )}
                        >
                          {new Intl.DateTimeFormat(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(new Date(s.startsAt))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-[#71717a]')}
        >
          {error ?? (pickedSlot ? fmtSlotLabel(pickedSlot.startsAt, studioTz) : 'Pick a slot above.')}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={!pickedSlot || busy}
          onClick={submit}
          data-testid="booking-confirm"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm booking'}
        </Button>
      </div>
    </div>
  );
}

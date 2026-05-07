// Phase 2D PR-B -- booking slot generation.
//
// Studio availability rows are weekday-bucketed wall-clock windows in a
// chosen IANA timezone (default America/New_York). For a given day we
// generate slots stepping `slot_minutes` from `start_time` to `end_time`
// (exclusive at the end), then filter out anything that overlaps a
// confirmed booking.

export type AvailabilityRow = {
  weekday: number; // 0=Sun..6=Sat (matches Postgres EXTRACT(DOW))
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
  timezone: string;
  slot_minutes: number;
};

export type BookingRow = {
  starts_at: string; // ISO
  ends_at: string; // ISO
  status: string | null;
};

export type Slot = {
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  timezone: string;
};

function parseHHMM(s: string): { h: number; m: number } {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/**
 * Convert a wall-clock (yyyy-mm-dd, HH:MM) in a named timezone to a UTC ISO
 * string. Implementation: build a tentative Date in UTC, ask Intl what its
 * wall-clock would be in the target zone, then offset by the difference.
 *
 * This is accurate for fixed offsets and DST boundaries because we re-anchor
 * at the same wall-clock minute we wanted.
 */
function wallClockInZoneToIso(
  date: { y: number; m: number; d: number },
  time: { h: number; min: number },
  timeZone: string,
): string {
  // Step 1 -- tentative UTC date for the wall-clock numbers.
  const tentative = Date.UTC(date.y, date.m - 1, date.d, time.h, time.min, 0);

  // Step 2 -- ask Intl what wall-clock that UTC instant maps to in the zone.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(tentative));
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  const wallY = Number(lookup.year);
  const wallM = Number(lookup.month);
  const wallD = Number(lookup.day);
  // Intl can return '24' for hour at exact midnight in some zones; normalize.
  const wallH = Number(lookup.hour) % 24;
  const wallMin = Number(lookup.minute);

  const wallUTC = Date.UTC(wallY, wallM - 1, wallD, wallH, wallMin, 0);
  const offsetMs = wallUTC - tentative; // how far ahead the zone-clock is from UTC
  return new Date(tentative - offsetMs).toISOString();
}

function dowFromYmdInZone(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[fmt.format(date)] ?? 0;
}

function ymdInZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const lookup: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) lookup[p.type] = p.value;
  return {
    y: Number(lookup.year),
    m: Number(lookup.month),
    d: Number(lookup.day),
  };
}

/**
 * Generate the next `dayCount` calendar days of slots from
 * studio_availability rows, minus anything overlapping a confirmed booking.
 */
export function generateSlots(input: {
  availability: AvailabilityRow[];
  bookings: BookingRow[];
  now?: Date;
  dayCount?: number;
}): Slot[] {
  const now = input.now ?? new Date();
  const dayCount = input.dayCount ?? 14;

  const byDow = new Map<number, AvailabilityRow>();
  for (const a of input.availability) {
    byDow.set(a.weekday, a);
  }

  const out: Slot[] = [];
  const busy = input.bookings
    .filter((b) => (b.status ?? 'confirmed') === 'confirmed')
    .map((b) => ({
      start: new Date(b.starts_at).getTime(),
      end: new Date(b.ends_at).getTime(),
    }));

  for (let i = 0; i < dayCount; i++) {
    const cursor = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    // Pick weekday from the FIRST availability row's tz; rows share a tz in
    // the seeded data. If rows differ, weekday is computed per row below.
    const firstTz = input.availability[0]?.timezone ?? 'America/New_York';
    const dow = dowFromYmdInZone(cursor, firstTz);
    const avail = byDow.get(dow);
    if (!avail) continue;

    const ymd = ymdInZone(cursor, avail.timezone);
    const start = parseHHMM(avail.start_time);
    const end = parseHHMM(avail.end_time);

    let cursorMin = start.h * 60 + start.m;
    const endMin = end.h * 60 + end.m;
    while (cursorMin + avail.slot_minutes <= endMin) {
      const sH = Math.floor(cursorMin / 60);
      const sMin = cursorMin % 60;
      const eMin = cursorMin + avail.slot_minutes;
      const eH = Math.floor(eMin / 60);
      const eMinPart = eMin % 60;

      const startsAt = wallClockInZoneToIso(ymd, { h: sH, min: sMin }, avail.timezone);
      const endsAt = wallClockInZoneToIso(ymd, { h: eH, min: eMinPart }, avail.timezone);

      const startMs = new Date(startsAt).getTime();
      const endMs = new Date(endsAt).getTime();

      // Skip past slots.
      if (startMs > now.getTime()) {
        const overlaps = busy.some(
          (b) => Math.max(b.start, startMs) < Math.min(b.end, endMs),
        );
        if (!overlaps) {
          out.push({ startsAt, endsAt, timezone: avail.timezone });
        }
      }

      cursorMin += avail.slot_minutes;
    }
  }
  return out;
}

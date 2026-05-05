'use client';

import { useEffect, useState } from 'react';
import { Play, Square, Clock } from 'lucide-react';

const STORAGE_KEY = 'sage-time-tracker-session';

interface Session {
  id: string;
  started_at: string;
  description: string;
}

export function TimeTracker() {
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [opening, setOpening] = useState(false);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  async function start() {
    setBusy(true);
    setError(null);
    const startedAt = new Date().toISOString();
    const res = await fetch('/api/admin/time-entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        started_at: startedAt,
        ended_at: null,
        description: description || null,
        billable: true,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not start');
      return;
    }
    const data = (await res.json()) as { id: string };
    const s: Session = { id: data.id, started_at: startedAt, description };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
    setOpening(false);
    setDescription('');
  }

  async function stop() {
    if (!session) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/time-entries/${session.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ended_at: new Date().toISOString() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not stop');
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  if (session) {
    const elapsed = Math.max(0, now - new Date(session.started_at).getTime());
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[#0f0f12]/95 backdrop-blur shadow-lg px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
          </span>
          <span className="text-sm font-mono tabular-nums text-emerald-300">
            {fmtElapsed(elapsed)}
          </span>
          <button
            onClick={stop}
            disabled={busy}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-rose-300 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
            aria-label="Stop tracker"
          >
            <Square className="w-3 h-3" />
            stop
          </button>
        </div>
        {error && (
          <div className="mt-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (opening) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-72 rounded-xl border border-[#27272a] bg-[#0f0f12]/95 backdrop-blur shadow-xl p-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#71717a] mb-2">
          Start tracker
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you working on?"
          autoFocus
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2.5 py-1.5 text-sm text-[#fafafa] placeholder:text-[#52525b] focus:border-[#06b6d4]/60 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={start}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-medium text-[#0a0a0c] hover:bg-[#22d3ee] transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {busy ? 'Starting…' : 'Start'}
          </button>
          <button
            onClick={() => {
              setOpening(false);
              setDescription('');
              setError(null);
            }}
            className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpening(true)}
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-[#27272a] bg-[#0f0f12]/95 backdrop-blur shadow-lg px-3 py-2 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#06b6d4]/40 transition-colors"
      aria-label="Start time tracker"
    >
      <Clock className="w-4 h-4" />
      Track time
    </button>
  );
}

function fmtElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

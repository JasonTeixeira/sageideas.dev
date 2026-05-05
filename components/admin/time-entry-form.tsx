'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserOpt {
  id: string;
  label: string;
}
interface EngOpt {
  id: string;
  label: string;
}
interface TaskOpt {
  id: string;
  label: string;
  engagement_id: string | null;
}

export function TimeEntryForm({
  currentUserId,
  users,
  engagements,
  tasks,
}: {
  currentUserId: string;
  users: UserOpt[];
  engagements: EngOpt[];
  tasks: TaskOpt[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(currentUserId);
  const [engagementId, setEngagementId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [mode, setMode] = useState<'duration' | 'range'>('duration');
  const now = new Date();
  const nowLocal = toLocalInput(now);
  const [startedAt, setStartedAt] = useState(nowLocal);
  const [endedAt, setEndedAt] = useState(nowLocal);
  const [durationHours, setDurationHours] = useState('1');
  const [billable, setBillable] = useState(true);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTasks = useMemo(
    () => (engagementId ? tasks.filter((t) => t.engagement_id === engagementId) : tasks),
    [engagementId, tasks],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const startedIso = new Date(startedAt).toISOString();
    let endedIso: string | null = null;
    let durationMinutes: number | null = null;

    if (mode === 'range') {
      endedIso = new Date(endedAt).toISOString();
    } else {
      const hours = Number(durationHours);
      if (!hours || hours <= 0) {
        setError('Duration must be greater than zero');
        setBusy(false);
        return;
      }
      durationMinutes = Math.round(hours * 60);
    }

    const res = await fetch('/api/admin/time-entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        engagement_id: engagementId || null,
        task_id: taskId || null,
        description: description || null,
        started_at: startedIso,
        ended_at: endedIso,
        duration_minutes: durationMinutes,
        billable,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const t = await res.text().catch(() => 'error');
      setError(`Failed: ${t}`);
      return;
    }
    router.push('/admin/time-tracking');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-[#27272a] bg-[#0f0f12] p-6">
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <Field label="User">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Engagement">
        <select
          value={engagementId}
          onChange={(e) => {
            setEngagementId(e.target.value);
            setTaskId('');
          }}
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
        >
          <option value="">— None —</option>
          {engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Task (optional)">
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          disabled={filteredTasks.length === 0}
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none disabled:opacity-50"
        >
          <option value="">— None —</option>
          {filteredTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('duration')}
          className={`rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${
            mode === 'duration'
              ? 'bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/40'
              : 'border border-[#27272a] text-[#71717a] hover:text-[#fafafa]'
          }`}
        >
          Duration
        </button>
        <button
          type="button"
          onClick={() => setMode('range')}
          className={`rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${
            mode === 'range'
              ? 'bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/40'
              : 'border border-[#27272a] text-[#71717a] hover:text-[#fafafa]'
          }`}
        >
          Start / end
        </button>
      </div>

      <Field label="Started at">
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          required
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
        />
      </Field>

      {mode === 'range' ? (
        <Field label="Ended at">
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            required
            className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
          />
        </Field>
      ) : (
        <Field label="Duration (hours)">
          <input
            type="number"
            min="0.05"
            step="0.05"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
            className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
          />
        </Field>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          className="w-4 h-4 rounded border-[#27272a] bg-[#0a0a0c] text-[#06b6d4]"
        />
        <span className="text-sm text-[#fafafa]">Billable</span>
      </label>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What did you work on?"
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b] focus:border-[#06b6d4]/60 focus:outline-none resize-y"
        />
      </Field>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#06b6d4] px-4 py-2 text-sm font-medium text-[#0a0a0c] hover:bg-[#22d3ee] transition-colors disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save entry'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/time-tracking')}
          className="rounded-lg border border-[#27272a] px-4 py-2 text-sm text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </span>
      {children}
    </label>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

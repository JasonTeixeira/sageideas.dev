'use client';

import { useState, useTransition, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/portal/ui/button';
import { Input } from '@/components/portal/ui/input';
import { MessageSquarePlus, X } from 'lucide-react';

export interface NewThreadEngagement {
  id: string;
  title: string;
}

interface Props {
  engagements: NewThreadEngagement[];
}

export function NewThreadButton({ engagements }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [engagementId, setEngagementId] = useState<string>(engagements[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const subjectId = useId();
  const bodyId = useId();
  const engagementSelectId = useId();

  function reset() {
    setSubject('');
    setBody('');
    setEngagementId(engagements[0]?.id ?? '');
    setError(null);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subject.trim() || !body.trim() || !engagementId) {
      setError('Subject, body, and engagement are required.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/portal/threads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subject.trim(),
            body: body.trim(),
            engagement_id: engagementId,
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | { thread_id?: string; engagement_id?: string; error?: string }
          | null;
        if (!res.ok || !json?.engagement_id) {
          setError(json?.error ?? `Failed (${res.status})`);
          return;
        }
        setOpen(false);
        reset();
        router.push(`/portal/messages/${json.engagement_id}`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        setError(msg);
      }
    });
  }

  if (engagements.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="new-thread-button"
      >
        <MessageSquarePlus className="w-4 h-4 mr-1.5" />
        New thread
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-thread-title"
          data-testid="new-thread-modal"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#27272a] bg-[#09090B] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#27272a]">
              <h2 id="new-thread-title" className="text-base font-semibold text-[#fafafa]">
                Start a new thread
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-1 rounded-md text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="px-5 py-4 space-y-4">
              <div>
                <label
                  htmlFor={engagementSelectId}
                  className="block text-xs font-medium text-[#a1a1aa] mb-1.5"
                >
                  Engagement
                </label>
                <select
                  id={engagementSelectId}
                  value={engagementId}
                  onChange={(e) => setEngagementId(e.target.value)}
                  data-testid="new-thread-engagement"
                  className="w-full rounded-md border border-[#27272a] bg-[#0f0f12] text-[#fafafa] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {engagements.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={subjectId}
                  className="block text-xs font-medium text-[#a1a1aa] mb-1.5"
                >
                  Subject
                </label>
                <Input
                  id={subjectId}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  data-testid="new-thread-subject"
                  placeholder="What is this about?"
                />
              </div>

              <div>
                <label
                  htmlFor={bodyId}
                  className="block text-xs font-medium text-[#a1a1aa] mb-1.5"
                >
                  Message
                </label>
                <textarea
                  id={bodyId}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={5}
                  data-testid="new-thread-body"
                  className="w-full rounded-md border border-[#27272a] bg-[#0f0f12] text-[#fafafa] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Type your message…"
                />
              </div>

              {error && (
                <p
                  className="text-xs text-rose-400"
                  data-testid="new-thread-error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={pending}
                  data-testid="new-thread-submit"
                >
                  {pending ? 'Creating…' : 'Create thread'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

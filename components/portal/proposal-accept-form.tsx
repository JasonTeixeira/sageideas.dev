'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Input, Textarea } from '@/components/portal/ui/input';
import { cn } from '@/lib/utils';

type Mode = 'menu' | 'accept' | 'decline';

export function ProposalAcceptForm({
  proposalId,
  token,
}: {
  proposalId: string;
  token: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Type your full legal name.');
      return;
    }
    if (!agreed) {
      setError('You must agree before signing.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/proposals/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        engagement_id?: string | null;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Accept failed');
      }
      const next = json.engagement_id
        ? `/portal/projects/${json.engagement_id}?welcome=1`
        : `/portal/proposals/${proposalId}`;
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitDecline(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/proposals/${proposalId}/decline`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || null, token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Decline failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decline failed');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'menu') {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[#fafafa]">Your decision</h2>
        <p className="text-xs text-[#71717a]">
          Accept to start the engagement; decline if this isn&apos;t a fit. We capture a
          signature, IP, and timestamp on accept.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setMode('accept')}
            data-testid="proposal-accept-cta"
          >
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode('decline')}
            data-testid="proposal-decline-cta"
          >
            Decline
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'decline') {
    return (
      <form onSubmit={submitDecline} className="space-y-4">
        <h2 className="text-sm font-medium text-[#fafafa]">Decline</h2>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional — what would have made this work for you?"
          data-testid="proposal-decline-reason"
        />
        <div className="flex items-center justify-between gap-3">
          <span
            role="status"
            aria-live="polite"
            className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
          >
            {error ?? '·'}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMode('menu')}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit decline'}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitAccept} className="space-y-4">
      <h2 className="text-sm font-medium text-[#fafafa]">Accept</h2>
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
          Full legal name
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={200}
          required
          placeholder="Jane Q. Public"
          data-testid="proposal-accept-name"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-[#a1a1aa] select-none">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          data-testid="proposal-accept-agree"
        />
        <span>
          I&apos;m authorized to accept this proposal on behalf of my organization. My
          typed name acts as my electronic signature.
        </span>
      </label>
      <div className="flex items-center justify-between gap-3">
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
        >
          {error ?? '·'}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMode('menu')}>
            Back
          </Button>
          <Button type="submit" size="sm" disabled={busy} data-testid="proposal-accept-submit">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sign &amp; accept'}
          </Button>
        </div>
      </div>
    </form>
  );
}

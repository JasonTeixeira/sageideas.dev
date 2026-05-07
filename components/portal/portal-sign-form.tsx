'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Input } from '@/components/portal/ui/input';
import { cn } from '@/lib/utils';

export function PortalSignForm({
  documentId,
  token,
}: {
  documentId: string;
  token: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Type your full legal name.');
      return;
    }
    if (!agreed) {
      setError('You must agree to be bound before signing.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), token }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Signing failed');
      }
      router.replace(`/portal/documents/${documentId}/sign?signed=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
          Full legal name
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={200}
          placeholder="Jane Q. Public"
          required
          data-testid="sign-name-input"
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-[#a1a1aa] select-none">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          data-testid="sign-agree-checkbox"
        />
        <span>
          I agree to be legally bound by this document. My typed name above acts as my
          electronic signature.
        </span>
      </label>
      <div className="flex items-center justify-between gap-3 pt-2">
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
        >
          {error ?? '·'}
        </span>
        <Button type="submit" size="sm" disabled={busy} data-testid="sign-submit">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sign now'}
        </Button>
      </div>
    </form>
  );
}

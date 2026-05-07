'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/portal/ui/button';
import { Input } from '@/components/portal/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.mfa.listFactors().then(({ data, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (!verified) {
        setError('No verified TOTP factor on this account.');
        return;
      }
      setFactorId(verified.id);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const sb = createSupabaseBrowserClient();
      const { error: err } = await sb.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (err) throw new Error(err.message);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
          Authenticator code
        </span>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          autoFocus
          required
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span
          role="status"
          aria-live="polite"
          className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
        >
          {error ?? '·'}
        </span>
        <Button type="submit" size="md" disabled={busy || !factorId}>
          {busy ? 'Verifying…' : 'Verify'}
        </Button>
      </div>
    </form>
  );
}

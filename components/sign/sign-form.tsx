'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function SignForm({
  token,
  documentTitle,
}: {
  token: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const canSubmit = name.trim().length >= 2 && agreed && !submitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startSubmit(async () => {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Signing failed. Try again or email sage@sageideas.dev.');
        return;
      }
      router.push(`/sign/${token}/success`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#fafafa]">Sign this document</h3>
        <p className="text-xs text-[#a1a1aa] mt-1">
          You&apos;re signing: <span className="font-mono">{documentTitle}</span>
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
          Type your full legal name
        </span>
        <input
          required
          autoComplete="name"
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-base text-[#fafafa] focus:border-[#06b6d4] focus:outline-none"
        />
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#06b6d4]"
        />
        <span className="text-xs text-[#a1a1aa] leading-relaxed">
          I agree that typing my name above is my electronic signature, that it is
          legally binding under the U.S. ESIGN Act and equivalent laws, and that I
          intend to be bound by the terms of this document.
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium bg-[#06b6d4] text-[#09090b] hover:bg-[#22d3ee] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="w-4 h-4" />
        {submitting ? 'Recording signature…' : 'Sign and submit'}
      </button>
    </form>
  );
}

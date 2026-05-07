'use client';

import { useEffect, useState } from 'react';
import { initials } from '@/lib/utils';

export function TopbarAvatar({
  path,
  fullName,
  email,
}: {
  path: string | null;
  fullName: string | null;
  email: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!path) {
        setSrc(null);
        return;
      }
      if (/^https?:\/\//i.test(path)) {
        setSrc(path);
        return;
      }
      try {
        const res = await fetch(`/api/portal/avatar/url?path=${encodeURIComponent(path)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { url: string | null };
        if (!cancelled) setSrc(json.url ?? null);
      } catch {
        // non-fatal
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [path]);

  const label = fullName ?? email;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        className="w-8 h-8 rounded-full border border-[#27272a] object-cover"
        data-testid="topbar-avatar"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full border border-[#27272a] bg-[#18181b] flex items-center justify-center text-[10px] font-medium text-[#a1a1aa]"
      data-testid="topbar-avatar"
    >
      {initials(label)}
    </div>
  );
}

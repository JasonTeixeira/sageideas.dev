'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type OrgSwitcherMembership = {
  id: string;
  name: string;
  slug: string | null;
};

type Props = {
  active: OrgSwitcherMembership | null;
  memberships: OrgSwitcherMembership[];
};

export function OrgSwitcher({ active, memberships }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '/portal';
  const searchParams = useSearchParams();

  if (memberships.length === 0 || !active) return null;

  if (memberships.length === 1) {
    return (
      <span
        data-testid="org-switcher"
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#27272a] bg-[#0f0f12] text-[11px] text-[#a1a1aa]"
        aria-label="Active organization"
      >
        <span className="truncate max-w-[160px]">{active.name}</span>
      </span>
    );
  }

  function switchTo(slug: string | null) {
    if (!slug) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('org', slug);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="org-switcher"
          aria-label="Switch organization"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#27272a] bg-[#0f0f12] text-[11px] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
        >
          <span className="truncate max-w-[160px]">{active.name}</span>
          <ChevronsUpDown className="w-3 h-3 shrink-0 text-[#52525b]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#71717a]">
          Switch organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => {
          const isActive = m.id === active.id;
          return (
            <DropdownMenuItem
              key={m.id}
              data-testid="org-switcher-option"
              data-slug={m.slug ?? ''}
              onSelect={(e) => {
                e.preventDefault();
                switchTo(m.slug);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="flex-1 truncate">{m.name}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-[#06b6d4]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

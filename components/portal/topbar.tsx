'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

export function Topbar({
  crumbs,
  actions,
  rightSlot,
}: {
  crumbs: Crumb[];
  actions?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-[#09090B]/80 border-b border-[#27272a]">
      <div className="flex items-center justify-between px-6 lg:px-8 h-14">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#52525b] shrink-0" />}
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-[#a1a1aa] hover:text-[#fafafa] transition-colors truncate"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-[#fafafa] font-medium truncate">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

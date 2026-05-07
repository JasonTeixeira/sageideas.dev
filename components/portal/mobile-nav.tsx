'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { cn } from '@/lib/utils';
import { portalAdminNav, portalClientNav } from './nav-items';

type Props = {
  orgName?: string;
  isAdmin?: boolean;
};

export function MobileNav({ orgName, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const lastPathRef = useRef(pathname);

  const close = useCallback(() => setOpen(false), []);

  // Close on route change.
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // Esc + focus trap + initial focus + scroll lock.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first nav item when drawer opens.
    requestAnimationFrame(() => {
      firstLinkRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="portal-mobile-nav"
        data-testid="portal-mobile-nav-trigger"
      >
        <Menu className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Portal navigation"
          id="portal-mobile-nav"
        >
          {/* Full-screen tinted layer purely for the visual scrim. */}
          <div
            className="absolute inset-0 bg-[#000]/70 pointer-events-none"
            aria-hidden="true"
          />
          {/* Click target: only the area NOT covered by the drawer, so
              Playwright's center-click on the backdrop reliably hits it. */}
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="absolute inset-y-0 right-0 left-72 cursor-default"
            data-testid="portal-mobile-nav-backdrop"
          />
          <aside
            ref={drawerRef}
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0c] border-r border-[#27272a] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
              <div className="min-w-0">
                <div className="font-semibold text-[#fafafa] text-sm">The Studio</div>
                <div className="text-[10px] text-[#71717a] truncate uppercase tracking-wider">
                  {orgName ?? 'Sage Ideas'}
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              <div className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
                Workspace
              </div>
              {portalClientNav.map(({ href, label, icon: Icon }, idx) => {
                const active =
                  href === '/portal'
                    ? pathname === '/portal'
                    : pathname === href || pathname?.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    ref={idx === 0 ? firstLinkRef : undefined}
                    onClick={close}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-[#18181b] text-[#fafafa]'
                        : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <>
                  <div className="px-2 pt-5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
                    Admin
                  </div>
                  {portalAdminNav.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname?.startsWith(href + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={close}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-[#18181b] text-[#fafafa]'
                            : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
            <div className="p-4 border-t border-[#27272a]">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#fafafa]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

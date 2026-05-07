'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search,
  FolderKanban,
  FileText,
  MessageSquare,
  LifeBuoy,
} from 'lucide-react';

export type CommandIndexProject = {
  id: string;
  title: string;
  status: string | null;
};

export type CommandIndexInvoice = {
  id: string;
  number: string | null;
  status: string | null;
};

export type CommandIndexThread = {
  id: string;
  engagementId: string | null;
  subject: string;
};

export type CommandIndex = {
  projects: CommandIndexProject[];
  invoices: CommandIndexInvoice[];
  threads: CommandIndexThread[];
};

const HELP_SHORTCUTS: Array<{ label: string; href: string }> = [
  { label: 'Dashboard', href: '/portal' },
  { label: 'Settings', href: '/portal/settings' },
  { label: 'Audit Log', href: '/portal/settings/audit-log' },
  { label: 'Calendar', href: '/portal/calendar' },
  { label: 'Documents', href: '/portal/documents' },
  { label: 'Inbox', href: '/portal/inbox' },
  { label: 'Billing', href: '/portal/billing' },
];

export function CommandPalette({ index }: { index: CommandIndex }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
      // Allow forward-slash to also open if the user isn't typing somewhere.
      if (
        e.key === '/' &&
        !open &&
        target &&
        !['INPUT', 'TEXTAREA'].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    // Listen for clicks on the trigger badge (rendered separately).
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('sage:cmdk:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('sage:cmdk:open', onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
    } else if (previouslyFocused.current) {
      try {
        previouslyFocused.current.focus();
      } catch {
        /* noop */
      }
    }
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <Command
        data-testid="cmdk-root"
        aria-label="Command palette"
        className="relative w-full max-w-xl rounded-xl border border-[#27272a] bg-[#0f0f12] shadow-2xl overflow-hidden"
        loop
      >
        <div className="flex items-center gap-2 px-4 border-b border-[#27272a]">
          <Search className="w-4 h-4 text-[#71717a] shrink-0" />
          <Command.Input
            data-testid="cmdk-input"
            autoFocus
            placeholder="Search projects, invoices, messages…"
            className="flex h-12 w-full bg-transparent py-3 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b]"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#27272a] bg-[#18181b] text-[10px] font-mono text-[#71717a]">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty
            data-testid="cmdk-empty"
            className="py-8 text-center text-sm text-[#71717a]"
          >
            No results found.
          </Command.Empty>

          {index.projects.length > 0 && (
            <Command.Group
              heading="Projects"
              className="text-[10px] uppercase tracking-wider text-[#52525b] px-2 py-1.5"
            >
              {index.projects.map((p) => (
                <Command.Item
                  key={p.id}
                  data-testid="cmdk-item"
                  value={`project ${p.title} ${p.status ?? ''}`}
                  onSelect={() => go(`/portal/projects/${p.id}`)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#e4e4e7] cursor-pointer aria-selected:bg-[#18181b] aria-selected:text-[#fafafa]"
                >
                  <FolderKanban className="w-4 h-4 text-[#06b6d4]" />
                  <span className="flex-1 truncate">{p.title}</span>
                  {p.status && (
                    <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono">
                      {p.status}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {index.invoices.length > 0 && (
            <Command.Group
              heading="Invoices"
              className="text-[10px] uppercase tracking-wider text-[#52525b] px-2 py-1.5"
            >
              {index.invoices.map((iv) => {
                const label = iv.number ?? iv.id.slice(0, 8);
                return (
                  <Command.Item
                    key={iv.id}
                    data-testid="cmdk-item"
                    value={`invoice ${label} ${iv.status ?? ''}`}
                    onSelect={() => go(`/portal/invoices/${iv.id}`)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#e4e4e7] cursor-pointer aria-selected:bg-[#18181b] aria-selected:text-[#fafafa]"
                  >
                    <FileText className="w-4 h-4 text-[#a78bfa]" />
                    <span className="flex-1 truncate">{label}</span>
                    {iv.status && (
                      <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono">
                        {iv.status}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {index.threads.length > 0 && (
            <Command.Group
              heading="Messages"
              className="text-[10px] uppercase tracking-wider text-[#52525b] px-2 py-1.5"
            >
              {index.threads.map((t) => (
                <Command.Item
                  key={t.id}
                  data-testid="cmdk-item"
                  value={`message ${t.subject}`}
                  onSelect={() =>
                    go(
                      t.engagementId
                        ? `/portal/messages/${t.engagementId}`
                        : `/portal/messages`,
                    )
                  }
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#e4e4e7] cursor-pointer aria-selected:bg-[#18181b] aria-selected:text-[#fafafa]"
                >
                  <MessageSquare className="w-4 h-4 text-[#10b981]" />
                  <span className="flex-1 truncate">{t.subject}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="Help"
            className="text-[10px] uppercase tracking-wider text-[#52525b] px-2 py-1.5"
          >
            {HELP_SHORTCUTS.map((s) => (
              <Command.Item
                key={s.href}
                data-testid="cmdk-item"
                value={`help ${s.label}`}
                onSelect={() => go(s.href)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#e4e4e7] cursor-pointer aria-selected:bg-[#18181b] aria-selected:text-[#fafafa]"
              >
                <LifeBuoy className="w-4 h-4 text-[#f59e0b]" />
                <span className="flex-1 truncate">{s.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono">
                  go
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      data-testid="cmdk-trigger"
      onClick={() => window.dispatchEvent(new CustomEvent('sage:cmdk:open'))}
      className="hidden sm:inline-flex items-center gap-2 px-2 py-1 rounded-md border border-[#27272a] bg-[#0f0f12] text-[11px] text-[#71717a] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
      aria-label="Open command palette"
    >
      <Search className="w-3 h-3" />
      <span>Search</span>
      <kbd className="ml-1 px-1 rounded bg-[#18181b] border border-[#27272a] text-[10px] font-mono text-[#a1a1aa]">
        ⌘K
      </kbd>
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'status', label: 'Status updates' },
  { id: 'files', label: 'Files' },
  { id: 'kickoff', label: 'Kickoff' },
] as const;

export type ProjectTabId = (typeof TABS)[number]['id'];

export function ProjectTabs({
  initial,
  panels,
}: {
  initial: ProjectTabId;
  panels: Partial<Record<ProjectTabId, React.ReactNode>>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = params.get('tab') as ProjectTabId | null;
  const [active, setActive] = useState<ProjectTabId>(
    fromUrl && TABS.some((t) => t.id === fromUrl) ? fromUrl : initial,
  );

  function selectTab(id: ProjectTabId) {
    setActive(id);
    const usp = new URLSearchParams(params.toString());
    usp.set('tab', id);
    router.replace(`?${usp.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div className="border-b border-[#27272a] flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              data-testid={t.id === 'kickoff' ? 'kickoff-tab' : undefined}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-[#06b6d4] text-[#fafafa]'
                  : 'border-transparent text-[#71717a] hover:text-[#a1a1aa]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="pt-6">{panels[active] ?? null}</div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { cn } from '@/lib/utils';

export type OrgOption = { id: string; name: string };

export type MilestoneSeed = { name: string; days_offset?: number };
export type TaskSeed = { title: string; milestone?: string };

export type ProjectTemplateRow = {
  id: string;
  name: string;
  service_type: string | null;
  description: string | null;
  default_milestones: unknown;
  default_tasks: unknown;
  default_target_days: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

function readMilestones(raw: unknown): MilestoneSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { name: unknown; days_offset?: unknown } => !!x && typeof x === 'object')
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      name: x.name as string,
      days_offset:
        typeof x.days_offset === 'number' ? x.days_offset : Number(x.days_offset ?? 0) || 0,
    }));
}

function readTasks(raw: unknown): TaskSeed[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is { title: unknown; milestone?: unknown } => !!x && typeof x === 'object',
    )
    .filter((x) => typeof x.title === 'string')
    .map((x) => ({
      title: x.title as string,
      milestone: typeof x.milestone === 'string' ? x.milestone : undefined,
    }));
}

export function ProjectTemplatesList({
  templates,
  orgs,
}: {
  templates: ProjectTemplateRow[];
  orgs: OrgOption[];
}) {
  const [picking, setPicking] = useState<ProjectTemplateRow | null>(null);

  return (
    <>
      <div className="space-y-3" data-testid="admin-templates-list">
        {templates.map((t) => {
          const milestones = readMilestones(t.default_milestones);
          const tasks = readTasks(t.default_tasks);
          return (
            <Card key={t.id}>
              <CardContent className="p-5" data-testid="template-row">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-semibold text-[#fafafa] truncate">
                        {t.name}
                      </h3>
                      {t.service_type ? (
                        <Badge tone="cyan">{t.service_type}</Badge>
                      ) : null}
                      {t.is_active === false ? (
                        <Badge tone="rose">inactive</Badge>
                      ) : null}
                      {t.default_target_days ? (
                        <span className="text-[10px] text-[#71717a]">
                          ~{t.default_target_days} days
                        </span>
                      ) : null}
                    </div>
                    {t.description ? (
                      <p className="text-xs text-[#a1a1aa] mb-2">{t.description}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#71717a]">
                      <span>
                        {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
                      </span>
                      <span>·</span>
                      <span>
                        {tasks.length} task{tasks.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPicking(t)}
                    data-testid="engagement-from-template-button"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> New from template
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {picking ? (
        <TemplatePickerModal
          template={picking}
          orgs={orgs}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </>
  );
}

function TemplatePickerModal({
  template,
  orgs,
  onClose,
}: {
  template: ProjectTemplateRow;
  orgs: OrgOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function instantiate() {
    if (!orgId) {
      setError('Pick an org.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/project-templates/${template.id}/instantiate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        engagement_id?: string;
        error?: string;
      };
      if (!res.ok || !json.engagement_id) {
        throw new Error(json.error ?? 'Instantiate failed');
      }
      router.replace(`/portal/projects/${json.engagement_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instantiate failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      data-testid="template-picker-modal"
    >
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#fafafa]">
              New engagement from {template.name}
            </h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              Picks the chosen org and seeds milestones + tasks from the template.
            </p>
          </div>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
              Organization
            </span>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
              data-testid="template-picker-org"
            >
              {orgs.length === 0 ? (
                <option value="">No orgs available</option>
              ) : (
                orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="flex items-center justify-between gap-3 pt-2">
            <span
              role="status"
              aria-live="polite"
              className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
            >
              {error ?? '·'}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={instantiate}
                disabled={busy || !orgId}
                data-testid="template-instantiate-confirm"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create engagement'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

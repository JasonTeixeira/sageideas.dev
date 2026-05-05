'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Save, FileSignature, Sparkles, X } from 'lucide-react';

interface TemplateVariable {
  name: string;
  label?: string;
  type?: string;
}

interface TemplateLike {
  id: string;
  slug: string;
  title: string;
  category: string;
  body_md: string;
  variables: unknown[];
  active: boolean;
  version: number;
  updated_at: string;
}

interface OrgLike {
  id: string;
  name: string;
}

interface EngagementLike {
  id: string;
  title: string | null;
  organization_id: string;
}

const CATEGORIES = [
  'legal',
  'proposal',
  'sow',
  'change_order',
  'msa',
  'nda',
  'ip',
  'contractor',
  'other',
];

type Tab = 'edit' | 'preview' | 'variables' | 'generate';

function isVariable(v: unknown): v is TemplateVariable {
  return typeof v === 'object' && v !== null && 'name' in v;
}

function substitute(body: string, values: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key]) {
      return values[key];
    }
    return `{{${key}}}`;
  });
}

export function TemplateEditor({
  template,
  organizations,
  engagements,
}: {
  template: TemplateLike;
  organizations: OrgLike[];
  engagements: EngagementLike[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('edit');
  const [title, setTitle] = useState(template.title);
  const [category, setCategory] = useState(template.category);
  const [bodyMd, setBodyMd] = useState(template.body_md);
  const [active, setActive] = useState(template.active);
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);

  const variables: TemplateVariable[] = useMemo(
    () => template.variables.filter(isVariable),
    [template.variables],
  );

  const detectedVars = useMemo(() => {
    const found = new Set<string>();
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(bodyMd))) found.add(m[1]);
    return Array.from(found).sort();
  }, [bodyMd]);

  function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, category, body_md: bodyMd, active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Save failed');
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa] truncate">
            {title || 'Untitled template'}
          </h1>
          <p className="text-xs text-[#71717a] mt-1 font-mono">
            slug: {template.slug} · v{template.version} · updated{' '}
            {new Date(template.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGenOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-[#3f3f46] bg-[#18181b] text-[#fafafa] hover:bg-[#27272a]"
          >
            <FileSignature className="w-3.5 h-3.5" /> Generate contract
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-[#06b6d4] text-[#09090b] font-medium hover:bg-[#22d3ee] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="text-xs text-[#71717a]">Saved at {savedAt}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 accent-[#06b6d4]"
          />
          <span className="text-sm text-[#fafafa]">Active</span>
        </label>
      </div>

      <div className="flex items-center gap-1 border-b border-[#27272a]">
        {(['edit', 'preview', 'variables'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
              tab === t
                ? 'border-[#06b6d4] text-[#fafafa]'
                : 'border-transparent text-[#71717a] hover:text-[#fafafa]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'edit' && (
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          rows={28}
          className="w-full rounded-lg border border-[#27272a] bg-[#0a0a0c] px-4 py-3 text-sm text-[#fafafa] font-mono leading-relaxed focus:border-[#06b6d4] focus:outline-none resize-y"
          placeholder="# Markdown body. Use {{variable_name}} placeholders."
        />
      )}

      {tab === 'preview' && (
        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-6 py-5 text-sm leading-relaxed text-[#e4e4e7] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#fafafa] [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#fafafa] [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#fafafa] [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_strong]:text-[#fafafa] [&_strong]:font-semibold [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-[#27272a] [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-[#27272a] [&_td]:px-2 [&_td]:py-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMd}</ReactMarkdown>
        </div>
      )}

      {tab === 'variables' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#27272a] bg-[#0f0f12] p-4">
            <h3 className="text-sm font-medium text-[#fafafa] mb-2">
              Detected variables
            </h3>
            <p className="text-xs text-[#71717a] mb-3">
              Pulled from <code className="font-mono">{`{{name}}`}</code> placeholders in
              the body.
            </p>
            {detectedVars.length === 0 ? (
              <p className="text-xs text-[#71717a]">None.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-1 text-xs font-mono">
                {detectedVars.map((v) => (
                  <li key={v} className="text-[#a1a1aa]">
                    {`{{${v}}}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-[#27272a] bg-[#0f0f12] p-4">
            <h3 className="text-sm font-medium text-[#fafafa] mb-2">
              Declared variables (metadata)
            </h3>
            {variables.length === 0 ? (
              <p className="text-xs text-[#71717a]">None declared.</p>
            ) : (
              <ul className="divide-y divide-[#1f1f23]">
                {variables.map((v) => (
                  <li
                    key={v.name}
                    className="py-2 flex items-center gap-3 text-xs"
                  >
                    <span className="font-mono text-[#22d3ee] min-w-[160px]">
                      {v.name}
                    </span>
                    <span className="text-[#a1a1aa]">{v.label ?? '—'}</span>
                    <span className="ml-auto text-[#71717a] font-mono">
                      {v.type ?? 'text'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {genOpen && (
        <GenerateContractModal
          template={{ id: template.id, title, body_md: bodyMd, variables: detectedVars }}
          organizations={organizations}
          engagements={engagements}
          onClose={() => setGenOpen(false)}
        />
      )}
    </div>
  );
}

function GenerateContractModal({
  template,
  organizations,
  engagements,
  onClose,
}: {
  template: { id: string; title: string; body_md: string; variables: string[] };
  organizations: OrgLike[];
  engagements: EngagementLike[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string>(organizations[0]?.id ?? '');
  const [engagementId, setEngagementId] = useState<string>('');
  const [docTitle, setDocTitle] = useState(template.title);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredEngagements = useMemo(
    () => engagements.filter((e) => e.organization_id === orgId),
    [engagements, orgId],
  );

  const previewBody = useMemo(
    () => substitute(template.body_md, values),
    [template.body_md, values],
  );

  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const res = await fetch('/api/admin/contracts/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          organization_id: orgId || null,
          engagement_id: engagementId || null,
          title: docTitle,
          values,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Generation failed');
        return;
      }
      const j = await res.json();
      onClose();
      if (j?.signing_url) {
        navigator.clipboard?.writeText(window.location.origin + j.signing_url).catch(() => {});
      }
      router.push('/admin/templates');
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-[#27272a] bg-[#0f0f12] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#fafafa] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#22d3ee]" />
              Generate contract
            </h2>
            <p className="text-xs text-[#71717a] mt-0.5">
              From template <span className="font-mono">{template.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717a] hover:text-[#fafafa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
              Document title
            </span>
            <input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] focus:border-[#06b6d4] focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
                Organization
              </span>
              <select
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setEngagementId('');
                }}
                className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa]"
              >
                <option value="">— None —</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
                Engagement (optional)
              </span>
              <select
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={!orgId}
                className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#fafafa] disabled:opacity-50"
              >
                <option value="">— None —</option>
                {filteredEngagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title ?? e.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {template.variables.length > 0 && (
            <div className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3">
              <div className="text-[10px] uppercase tracking-widest font-mono text-[#71717a] mb-2">
                Variables
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {template.variables.map((v) => (
                  <label key={v} className="flex flex-col gap-1">
                    <span className="text-xs text-[#a1a1aa] font-mono">{v}</span>
                    <input
                      value={values[v] ?? ''}
                      onChange={(e) =>
                        setValues((s) => ({ ...s, [v]: e.target.value }))
                      }
                      className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4] focus:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <details className="rounded-lg border border-[#27272a] bg-[#0a0a0c] p-3">
            <summary className="text-xs text-[#71717a] cursor-pointer">
              Preview substituted body
            </summary>
            <pre className="mt-2 text-xs text-[#a1a1aa] whitespace-pre-wrap font-mono max-h-72 overflow-auto">
              {previewBody}
            </pre>
          </details>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs border border-[#3f3f46] text-[#fafafa] hover:bg-[#18181b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !docTitle}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs bg-[#06b6d4] text-[#09090b] font-medium hover:bg-[#22d3ee] disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

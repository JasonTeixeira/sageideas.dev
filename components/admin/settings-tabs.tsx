'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateBranding,
  uploadBrandingLogo,
  updateTeamMember,
  removeTeamMember,
} from '@/app/admin/settings/actions';

export interface StudioSettings {
  org_name: string;
  default_tax_rate: number;
  business_hours: Record<string, string | null>;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  brand_primary_hex: string;
  brand_accent_hex: string;
  tagline: string | null;
  email_signature: string | null;
}

export interface IntegrationsSummary {
  stripe: {
    connected: boolean;
    webhook_url: string;
    webhook_signed: boolean;
    dashboard_url: string;
  };
  resend: {
    connected: boolean;
    sender_domain: string;
    sends_30d: number;
    dashboard_url: string;
  };
  supabase: {
    connected: boolean;
    project_ref: string | null;
    dashboard_url: string;
  };
  vercel: {
    connected: boolean;
    commit_sha: string | null;
    env: string | null;
    dashboard_url: string;
  };
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  app_role: string;
  approval_status: string;
  last_sign_in_at: string | null;
}

const TABS = ['Org', 'Branding', 'Integrations', 'Team'] as const;
type Tab = (typeof TABS)[number];

export function AdminSettingsTabs({
  settings,
  integrations,
  team,
  currentUserId,
}: {
  settings: StudioSettings;
  integrations: IntegrationsSummary;
  team: TeamMember[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>('Org');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-[#27272a]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#06b6d4] text-[#06b6d4]'
                : 'border-transparent text-[#71717a] hover:text-[#fafafa]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Org' && <OrgTab initial={settings} />}
      {tab === 'Branding' && <BrandingTab initial={settings} />}
      {tab === 'Integrations' && <IntegrationsTab summary={integrations} />}
      {tab === 'Team' && <TeamTab initial={team} currentUserId={currentUserId} />}
    </div>
  );
}

function SaveBar({
  pending,
  ok,
  error,
}: {
  pending: boolean;
  ok: boolean;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#06b6d4] px-4 py-2 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
      {ok && <span className="text-xs text-emerald-400">Saved.</span>}
      {error && <span className="text-xs text-rose-400 truncate">{error}</span>}
    </div>
  );
}

function OrgTab({ initial }: { initial: StudioSettings }) {
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setOk(false);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const hours: Record<string, string | null> = {};
        for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
          const v = String(fd.get(`hours_${day}`) ?? '').trim();
          hours[day] = v || null;
        }
        const payload = {
          org_name: String(fd.get('org_name') ?? '').trim(),
          default_tax_rate: Number(fd.get('default_tax_rate') ?? 0),
          business_hours: hours,
        };
        start(async () => {
          const res = await fetch('/api/admin/settings', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError(await res.text().catch(() => 'Save failed'));
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
      className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            Studio name
          </span>
          <input
            name="org_name"
            defaultValue={initial.org_name}
            className="w-full rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa]"
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            Default tax rate (%)
          </span>
          <input
            name="default_tax_rate"
            type="number"
            step="0.01"
            defaultValue={initial.default_tax_rate}
            className="w-full rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] tabular-nums"
          />
        </label>
      </div>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a] block mb-2">
          Business hours
        </span>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => (
            <label key={d} className="space-y-1 block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525b]">
                {d}
              </span>
              <input
                name={`hours_${d}`}
                placeholder="9-17"
                defaultValue={initial.business_hours?.[d] ?? ''}
                className="w-full rounded-lg border border-[#27272a] bg-[#131316] px-2 py-1 text-xs text-[#fafafa]"
              />
            </label>
          ))}
        </div>
        <p className="text-[10px] text-[#52525b] mt-2">
          24h format. Leave blank for closed.
        </p>
      </div>
      <SaveBar pending={pending} ok={ok} error={error} />
    </form>
  );
}

function BrandingTab({ initial }: { initial: StudioSettings }) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primary, setPrimary] = useState(initial.brand_primary_hex);
  const [accent, setAccent] = useState(initial.brand_accent_hex);
  const [logo, setLogo] = useState(initial.logo_url ?? '');
  const [tagline, setTagline] = useState(initial.tagline ?? '');
  const [signature, setSignature] = useState(initial.email_signature ?? '');
  const router = useRouter();

  async function handleLogoFile(file: File) {
    setError(null);
    setOk(false);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadBrandingLogo(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLogo(res.url);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setOk(false);
        setError(null);
        const payload = {
          brand_primary_hex: primary,
          brand_accent_hex: accent,
          logo_url: logo || null,
          tagline: tagline || null,
          email_signature: signature || null,
        };
        start(async () => {
          const res = await updateBranding(payload);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
      className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5 space-y-4"
    >
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a] block">
          Logo
        </span>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg border border-[#27272a] bg-[#131316] flex items-center justify-center overflow-hidden">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[10px] text-[#52525b]">No logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="rounded-lg border border-[#27272a] bg-[#131316] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#06b6d4] cursor-pointer inline-flex items-center gap-2 w-fit">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleLogoFile(f);
                  e.target.value = '';
                }}
              />
              {uploading ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
            </label>
            <input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="Or paste URL: https://…"
              className="rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-xs text-[#fafafa] w-80"
            />
          </div>
        </div>
        <p className="text-[10px] text-[#52525b]">PNG/JPG/SVG/WEBP up to 2MB. Public URL.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Primary color" value={primary} onChange={setPrimary} />
        <ColorField label="Accent color" value={accent} onChange={setAccent} />
      </div>
      <label className="space-y-1 block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
          Site tagline (optional)
        </span>
        <textarea
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Premium engineering studio for ambitious teams."
          className="w-full rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] resize-y"
        />
      </label>
      <label className="space-y-1 block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
          Email signature (optional — used in transactional email footer)
        </span>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="— Sage Ideas&#10;sageideas.dev"
          className="w-full rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] resize-y"
        />
      </label>
      <SaveBar pending={pending} ok={ok} error={error} />
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 rounded border border-[#27272a] bg-[#131316]"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] font-mono"
        />
      </div>
    </label>
  );
}

function IntegrationsTab({ summary }: { summary: IntegrationsSummary }) {
  return (
    <div className="space-y-3">
      <IntegrationCard
        name="Stripe"
        desc="Card payments + invoice send"
        connected={summary.stripe.connected}
        dashboardUrl={summary.stripe.dashboard_url}
        details={
          <>
            <DetailRow label="Webhook URL" value={summary.stripe.webhook_url} mono />
            <DetailRow
              label="Signing secret"
              value={summary.stripe.webhook_signed ? 'configured' : 'missing'}
              tone={summary.stripe.webhook_signed ? 'good' : 'warn'}
            />
          </>
        }
      />
      <IntegrationCard
        name="Resend"
        desc="Transactional email"
        connected={summary.resend.connected}
        dashboardUrl={summary.resend.dashboard_url}
        details={
          <>
            <DetailRow label="Sender domain" value={summary.resend.sender_domain} mono />
            <DetailRow
              label="Sends · last 30 days"
              value={summary.resend.sends_30d.toLocaleString()}
            />
          </>
        }
      />
      <IntegrationCard
        name="Supabase"
        desc="Database, auth, storage"
        connected={summary.supabase.connected}
        dashboardUrl={summary.supabase.dashboard_url}
        details={
          <DetailRow
            label="Project ref"
            value={summary.supabase.project_ref ?? '—'}
            mono
          />
        }
      />
      <IntegrationCard
        name="Vercel"
        desc="Hosting + deploys"
        connected={summary.vercel.connected}
        dashboardUrl={summary.vercel.dashboard_url}
        details={
          <>
            <DetailRow
              label="Latest commit"
              value={summary.vercel.commit_sha ?? '—'}
              mono
            />
            <DetailRow label="Environment" value={summary.vercel.env ?? '—'} mono />
          </>
        }
      />
      <p className="text-[10px] text-[#52525b] pt-1">
        Status is read from environment variables. Configuration changes are made in each
        provider&rsquo;s dashboard.
      </p>
    </div>
  );
}

function IntegrationCard({
  name,
  desc,
  connected,
  dashboardUrl,
  details,
}: {
  name: string;
  desc: string;
  connected: boolean;
  dashboardUrl: string;
  details: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#fafafa]">{name}</div>
          <div className="text-xs text-[#71717a]">{desc}</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${
              connected
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                : 'border-[#3f3f46]/50 text-[#71717a] bg-[#3f3f46]/10'
            }`}
          >
            {connected ? 'connected' : 'not configured'}
          </span>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#27272a] px-2.5 py-1 text-xs text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4]"
          >
            Open dashboard ↗
          </a>
        </div>
      </div>
      <div className="rounded-lg border border-[#1f1f23] bg-[#131316] divide-y divide-[#1f1f23]">
        {details}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'good' | 'warn';
}) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-300'
        : 'text-[#fafafa]';
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </span>
      <span
        className={`text-xs truncate ${valueClass} ${mono ? 'font-mono' : ''}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ROLE_OPTIONS = ['admin', 'collaborator', 'client'] as const;

function TeamTab({
  initial,
  currentUserId,
}: {
  initial: TeamMember[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-[#fafafa]">Invite team member</div>
          <div className="text-xs text-[#71717a] mt-0.5">
            Send an invite from the user management page.
          </div>
        </div>
        <a
          href="/admin/users"
          className="rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2]"
        >
          Invite team member →
        </a>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-x-auto">
        {initial.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[#a1a1aa]">No team members yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
                <th className="text-left font-medium px-4 py-2.5">Name</th>
                <th className="text-left font-medium px-4 py-2.5">Email</th>
                <th className="text-left font-medium px-4 py-2.5">Role</th>
                <th className="text-left font-medium px-4 py-2.5">Last sign in</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23]">
              {initial.map((m) => (
                <TeamRow key={m.id} member={m} isSelf={m.id === currentUserId} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TeamRow({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const router = useRouter();

  function patch(input: { app_role?: string; approval_status?: string }) {
    setError(null);
    start(async () => {
      const res = await updateTeamMember({ id: member.id, ...input });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    start(async () => {
      const res = await removeTeamMember({ id: member.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRemoveOpen(false);
      router.refresh();
    });
  }

  const isActive = member.approval_status === 'approved';

  return (
    <tr className="hover:bg-[#131316]">
      <td className="px-4 py-3 text-[#fafafa]">
        {member.full_name || '—'}
        {isSelf && (
          <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-[#06b6d4]">
            you
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[#a1a1aa]">{member.email}</td>
      <td className="px-4 py-3">
        <select
          value={member.app_role}
          disabled={pending || isSelf}
          onChange={(e) => patch({ app_role: e.target.value })}
          className="rounded-lg border border-[#27272a] bg-[#131316] px-2 py-1 text-xs text-[#fafafa] disabled:opacity-50"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-[#a1a1aa] tabular-nums">
        {formatRelative(member.last_sign_in_at)}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={pending || isSelf}
          onClick={() =>
            patch({ approval_status: isActive ? 'rejected' : 'approved' })
          }
          className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest disabled:opacity-50 ${
            isActive
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:border-amber-500/60 hover:text-amber-300'
              : 'border-[#3f3f46]/60 text-[#71717a] bg-[#3f3f46]/10 hover:border-emerald-500/60 hover:text-emerald-300'
          }`}
          title={isActive ? 'Click to deactivate' : 'Click to reactivate'}
        >
          {isActive ? 'active' : member.approval_status}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-rose-400 truncate max-w-[160px]" title={error}>
              {error}
            </span>
          )}
          <button
            type="button"
            disabled={pending || isSelf}
            onClick={() => setRemoveOpen(true)}
            className="rounded-md border border-[#3f3f46]/60 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-rose-300 hover:border-rose-500/60 hover:bg-rose-500/10 disabled:opacity-30"
          >
            Remove
          </button>
        </div>
        <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove team member</DialogTitle>
              <DialogDescription>
                {member.full_name || member.email} will lose admin access. Their auth account
                stays so audit history is preserved; re-invite from /admin/users to restore.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setRemoveOpen(false)}
                className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleRemove}
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {pending ? 'Removing…' : 'Remove'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}

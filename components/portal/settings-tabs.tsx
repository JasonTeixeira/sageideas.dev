'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { Input } from '@/components/portal/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { User, Bell, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarPicker } from '@/components/portal/avatar-picker';

type ProfileShape = {
  email: string;
  fullName: string;
  company: string;
  avatarUrl: string | null;
  appRole: string;
  approvalStatus: string;
};

type Prefs = {
  email_message: boolean;
  email_deliverable: boolean;
  email_invoice: boolean;
  email_status_report: boolean;
  email_marketing: boolean;
  digest_frequency: string;
};

type Tab = 'profile' | 'notifications' | 'security';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export function SettingsTabs({
  profile,
  orgName,
  preferences,
}: {
  profile: ProfileShape;
  orgName: string | null;
  preferences: Prefs;
}) {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div>
      <nav
        className="flex items-center gap-1 mb-6 border-b border-[#27272a]"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                active
                  ? 'border-[#06b6d4] text-[#fafafa]'
                  : 'border-transparent text-[#71717a] hover:text-[#fafafa]',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === 'profile' && (
        <ProfileTab profile={profile} orgName={orgName} />
      )}
      {tab === 'notifications' && <NotificationsTab initial={preferences} />}
      {tab === 'security' && <SecurityTab email={profile.email} />}
    </div>
  );
}

function ProfileTab({
  profile,
  orgName,
}: {
  profile: ProfileShape;
  orgName: string | null;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [company, setCompany] = useState(profile.company);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, company }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to save');
      setStatus({ ok: true, msg: 'Profile updated.' });
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <AvatarPicker
          initialPath={profile.avatarUrl}
          fullName={profile.fullName}
          email={profile.email}
        />

        <form onSubmit={save} className="space-y-4">
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              autoComplete="name"
            />
          </Field>
          <Field label="Company">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={120}
              autoComplete="organization"
            />
          </Field>
          <Field label="Email">
            <Input value={profile.email} readOnly disabled />
          </Field>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <RowMeta label="Role" value={profile.appRole} />
            <RowMeta label="Status" value={profile.approvalStatus} />
            <RowMeta label="Organization" value={orgName ?? '—'} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <span
              role="status"
              aria-live="polite"
              className={cn(
                'text-xs',
                status?.ok ? 'text-[#10b981]' : 'text-[#f43f5e]',
              )}
            >
              {status?.msg}
            </span>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/notification-preferences/update', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Failed to save');
      setStatus({ ok: true, msg: 'Preferences saved.' });
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const switches: { key: keyof Prefs; label: string; description: string }[] = [
    { key: 'email_message', label: 'New messages', description: 'Email me when I get a message.' },
    {
      key: 'email_deliverable',
      label: 'Deliverable updates',
      description: 'Submitted, approved, or revisions requested.',
    },
    {
      key: 'email_invoice',
      label: 'Invoice activity',
      description: 'New invoices, due-soon reminders, payment receipts.',
    },
    {
      key: 'email_status_report',
      label: 'Status reports',
      description: 'Weekly summaries when published to my org.',
    },
    {
      key: 'email_marketing',
      label: 'Product news',
      description: 'New services and occasional studio updates. Off by default.',
    },
  ];

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <ul className="divide-y divide-[#1f1f23]">
          {switches.map((s) => (
            <li key={s.key} className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#fafafa]">{s.label}</div>
                <div className="text-xs text-[#71717a] mt-0.5">{s.description}</div>
              </div>
              <Toggle
                checked={prefs[s.key] as boolean}
                onChange={() => toggle(s.key)}
                label={s.label}
              />
            </li>
          ))}
        </ul>

        <Field label="Digest frequency">
          <select
            value={prefs.digest_frequency}
            onChange={(e) => setPrefs((p) => ({ ...p, digest_frequency: e.target.value }))}
            className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
          >
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span
            role="status"
            aria-live="polite"
            className={cn('text-xs', status?.ok ? 'text-[#10b981]' : 'text-[#f43f5e]')}
          >
            {status?.msg}
          </span>
          <Button type="button" size="sm" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (pw.length < 8) {
      setStatus({ ok: false, msg: 'Password must be at least 8 characters.' });
      return;
    }
    if (pw !== confirm) {
      setStatus({ ok: false, msg: 'Passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);
      setPw('');
      setConfirm('');
      setStatus({ ok: true, msg: 'Password updated.' });
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-medium text-[#fafafa] mb-1">Change password</h2>
          <p className="text-xs text-[#71717a] mb-5">
            Signed in as <span className="text-[#a1a1aa]">{email}</span>. Choose a new
            password for this account.
          </p>
          <form onSubmit={save} className="space-y-4">
            <Field label="New password">
              <Input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </Field>
            <div className="flex items-center justify-between gap-3 pt-2">
              <span
                role="status"
                aria-live="polite"
                className={cn(
                  'text-xs',
                  status?.ok ? 'text-[#10b981]' : 'text-[#f43f5e]',
                )}
              >
                {status?.msg}
              </span>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <MfaCard />

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-medium text-[#fafafa] mb-1">Active sessions</h2>
          <p className="text-xs text-[#71717a]">
            We don&apos;t expose individual session devices yet. To force sign-out on
            another browser, change your password above — all other sessions get
            invalidated. To revoke email-link access, manage links from your email
            provider.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

type MfaFactor = {
  id: string;
  factor_type: string;
  status: 'verified' | 'unverified' | string;
  friendly_name?: string | null;
};

type EnrollState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | {
      phase: 'pending';
      factorId: string;
      qrDataUrl: string;
      secret: string;
      uri: string;
    };

function MfaCard() {
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [enroll, setEnroll] = useState<EnrollState>({ phase: 'idle' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const refresh = useCallback(async () => {
    const sb = createSupabaseBrowserClient();
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) {
      setStatus({ ok: false, msg: error.message });
      setFactors([]);
      return;
    }
    const totp = (data?.totp ?? []) as MfaFactor[];
    setFactors(totp);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verified = factors?.find((f) => f.status === 'verified') ?? null;

  async function startEnroll() {
    setStatus(null);
    setBusy(true);
    setEnroll({ phase: 'loading' });
    try {
      const sb = createSupabaseBrowserClient();
      // Clean up any prior unverified TOTP factor so enroll doesn't 422 with
      // "factor already exists".
      const stale = (factors ?? []).find((f) => f.status !== 'verified');
      if (stale) {
        await sb.auth.mfa.unenroll({ factorId: stale.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
      if (error || !data) throw new Error(error?.message ?? 'Enroll failed');
      const uri = data.totp.uri;
      const secret = data.totp.secret;
      const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
      setEnroll({ phase: 'pending', factorId: data.id, qrDataUrl, secret, uri });
    } catch (err) {
      setEnroll({ phase: 'idle' });
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Enroll failed' });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (enroll.phase !== 'pending') return;
    setStatus(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setStatus({ ok: false, msg: 'Enter the 6-digit code from your authenticator.' });
      return;
    }
    setBusy(true);
    try {
      const sb = createSupabaseBrowserClient();
      const challenge = await sb.auth.mfa.challenge({ factorId: enroll.factorId });
      if (challenge.error || !challenge.data) {
        throw new Error(challenge.error?.message ?? 'Challenge failed');
      }
      const verify = await sb.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw new Error(verify.error.message);
      setEnroll({ phase: 'idle' });
      setCode('');
      setStatus({ ok: true, msg: 'Two-factor authentication enabled.' });
      await refresh();
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (enroll.phase !== 'pending') {
      setEnroll({ phase: 'idle' });
      return;
    }
    setBusy(true);
    try {
      const sb = createSupabaseBrowserClient();
      await sb.auth.mfa.unenroll({ factorId: enroll.factorId });
    } finally {
      setEnroll({ phase: 'idle' });
      setCode('');
      setBusy(false);
      void refresh();
    }
  }

  async function disable() {
    if (!verified) return;
    setStatus(null);
    setBusy(true);
    try {
      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.mfa.unenroll({ factorId: verified.id });
      if (error) throw new Error(error.message);
      setStatus({ ok: true, msg: 'Two-factor authentication disabled.' });
      await refresh();
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Failed to disable' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-[#fafafa] mb-1">
              Two-factor authentication
            </h2>
            <p className="text-xs text-[#71717a]">
              Use an authenticator app (1Password, Authy, Google Authenticator) to
              add a second sign-in step.
            </p>
          </div>
          {verified ? (
            <Badge tone="emerald">Enabled</Badge>
          ) : (
            <Badge tone="neutral">Off</Badge>
          )}
        </div>

        {factors === null ? (
          <p className="text-xs text-[#52525b]">Loading…</p>
        ) : verified && enroll.phase === 'idle' ? (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1f1f23]">
            <span className="text-xs text-[#71717a]">
              You&apos;ll be asked for a 6-digit code on next sign-in.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={disable}
            >
              {busy ? 'Working…' : 'Disable'}
            </Button>
          </div>
        ) : enroll.phase === 'pending' ? (
          <div className="space-y-4 pt-2 border-t border-[#1f1f23]">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enroll.qrDataUrl}
                alt="Scan with your authenticator app"
                className="w-[180px] h-[180px] bg-white rounded-md p-2 border border-[#27272a]"
              />
              <div className="text-xs text-[#a1a1aa] space-y-2 min-w-0">
                <p>Scan the QR with your authenticator app, or enter this secret manually:</p>
                <code className="block break-all bg-[#0f0f12] border border-[#27272a] rounded px-2 py-1 text-[#fafafa] font-mono text-[11px]">
                  {enroll.secret}
                </code>
              </div>
            </div>
            <Field label="6-digit code">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span
                role="status"
                aria-live="polite"
                className={cn(
                  'text-xs',
                  status?.ok ? 'text-[#10b981]' : 'text-[#f43f5e]',
                )}
              >
                {status?.msg}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={cancelEnroll}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={verifyCode}>
                  {busy ? 'Verifying…' : 'Verify & enable'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1f1f23]">
            <span
              role="status"
              aria-live="polite"
              className={cn(
                'text-xs',
                status?.ok ? 'text-[#10b981]' : 'text-[#f43f5e]',
              )}
            >
              {status?.msg ?? 'Add a layer of protection in under a minute.'}
            </span>
            <Button type="button" size="sm" disabled={busy} onClick={startEnroll}>
              {busy ? 'Working…' : 'Enroll'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function RowMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#52525b]">{label}</div>
      <div className="mt-0.5">
        <Badge tone="neutral">{value}</Badge>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        checked
          ? 'bg-[#06b6d4] border-[#06b6d4]'
          : 'bg-[#18181b] border-[#27272a]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[#fafafa] transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

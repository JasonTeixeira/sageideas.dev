import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { SettingsTabs } from '@/components/portal/settings-tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

type Profile = {
  email: string;
  full_name: string | null;
  company: string | null;
  avatar_url: string | null;
  app_role: string | null;
  approval_status: string | null;
};

type Prefs = {
  email_message: boolean;
  email_deliverable: boolean;
  email_invoice: boolean;
  email_status_report: boolean;
  email_marketing: boolean;
  digest_frequency: string;
};

const DEFAULT_PREFS: Prefs = {
  email_message: true,
  email_deliverable: true,
  email_invoice: true,
  email_status_report: true,
  email_marketing: false,
  digest_frequency: 'daily',
};

export default async function SettingsPage() {
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: profile } = await sb
    .from('profiles')
    .select('email, full_name, company, avatar_url, app_role, approval_status')
    .eq('id', ctx.user.clerk_id)
    .maybeSingle();

  const safeProfile: Profile = (profile as Profile | null) ?? {
    email: ctx.user.email,
    full_name: ctx.user.full_name,
    company: null,
    avatar_url: ctx.user.avatar_url,
    app_role: 'client',
    approval_status: 'approved',
  };

  const { data: prefsRow } = await sb
    .from('notification_preferences')
    .select(
      'email_message, email_deliverable, email_invoice, email_status_report, email_marketing, digest_frequency',
    )
    .eq('user_id', ctx.user.clerk_id)
    .maybeSingle();

  const prefs: Prefs = (prefsRow as Prefs | null) ?? DEFAULT_PREFS;

  return (
    <>
      <Topbar crumbs={[{ label: 'Settings' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Settings</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Profile, notifications, and account security.
          </p>
        </div>

        <SettingsTabs
          profile={{
            email: safeProfile.email,
            fullName: safeProfile.full_name ?? '',
            company: safeProfile.company ?? '',
            avatarUrl: safeProfile.avatar_url ?? null,
            appRole: safeProfile.app_role ?? '—',
            approvalStatus: safeProfile.approval_status ?? '—',
          }}
          orgName={ctx.organizationName ?? null}
          preferences={prefs}
        />

        <div className="mt-8">
          <Link
            href="/portal/settings/audit-log"
            data-testid="settings-audit-log-link"
            className="flex items-center gap-3 rounded-xl border border-[#27272a] bg-[#0f0f12] p-4 hover:border-[#06b6d4] transition-colors"
          >
            <ScrollText className="w-5 h-5 text-[#06b6d4] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#fafafa]">Audit log</div>
              <div className="text-xs text-[#71717a] mt-0.5">
                Review activity in your organization over the last 90 days.
              </div>
            </div>
            <span className="text-xs text-[#52525b]">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}

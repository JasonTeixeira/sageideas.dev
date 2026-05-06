import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import {
  AdminSettingsTabs,
  type StudioSettings,
  type IntegrationsSummary,
  type TeamMember,
} from '@/components/admin/settings-tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

const DEFAULT_SETTINGS: StudioSettings = {
  org_name: 'Sage Ideas',
  default_tax_rate: 0,
  business_hours: {
    mon: '9-17',
    tue: '9-17',
    wed: '9-17',
    thu: '9-17',
    fri: '9-17',
    sat: null,
    sun: null,
  },
  logo_url: null,
  primary_color: '#06B6D4',
  secondary_color: '#0E7490',
  brand_primary_hex: '#06B6D4',
  brand_accent_hex: '#0E7490',
  tagline: null,
  email_signature: null,
};

function supabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const m = url.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

function siteOriginFallback(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://sageideas.dev';
}

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [settingsRes, teamRes, emailCountRes] = await Promise.all([
    sb
      .from('studio_settings')
      .select(
        'org_name, default_tax_rate, business_hours, logo_url, primary_color, secondary_color, brand_primary_hex, brand_accent_hex, tagline, email_signature',
      )
      .eq('id', 1)
      .maybeSingle(),
    sb
      .from('profiles')
      .select('id, email, full_name, app_role, approval_status, created_at')
      .in('app_role', ['admin', 'collaborator'])
      .order('created_at', { ascending: true }),
    sb
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', since.toISOString()),
  ]);

  const raw = settingsRes.data as Partial<StudioSettings> | null;
  const settings: StudioSettings = {
    ...DEFAULT_SETTINGS,
    ...(raw ?? {}),
    business_hours:
      (raw?.business_hours as Record<string, string | null> | undefined) ??
      DEFAULT_SETTINGS.business_hours,
    default_tax_rate: Number(raw?.default_tax_rate ?? 0),
    brand_primary_hex: raw?.brand_primary_hex ?? raw?.primary_color ?? DEFAULT_SETTINGS.brand_primary_hex,
    brand_accent_hex: raw?.brand_accent_hex ?? raw?.secondary_color ?? DEFAULT_SETTINGS.brand_accent_hex,
  };

  const teamRows = (teamRes.data ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    app_role: string;
    approval_status: string;
    created_at: string;
  }>;

  // Fetch last_sign_in_at from auth.users for each team member.
  const lastSignInById = new Map<string, string | null>();
  await Promise.all(
    teamRows.map(async (m) => {
      const { data } = await sb.auth.admin.getUserById(m.id);
      lastSignInById.set(m.id, data?.user?.last_sign_in_at ?? null);
    }),
  );

  const team: TeamMember[] = teamRows.map((m) => ({
    id: m.id,
    email: m.email,
    full_name: m.full_name,
    app_role: m.app_role,
    approval_status: m.approval_status,
    last_sign_in_at: lastSignInById.get(m.id) ?? null,
  }));

  const projectRef = supabaseProjectRef();
  const origin = siteOriginFallback();
  const integrations: IntegrationsSummary = {
    stripe: {
      connected: !!process.env.STRIPE_SECRET_KEY,
      webhook_url: `${origin}/api/stripe/webhook`,
      webhook_signed: !!process.env.STRIPE_WEBHOOK_SECRET,
      dashboard_url: 'https://dashboard.stripe.com',
    },
    resend: {
      connected: !!process.env.RESEND_API_KEY,
      sender_domain: 'sageideas.dev',
      sends_30d: emailCountRes.count ?? 0,
      dashboard_url: 'https://resend.com/emails',
    },
    supabase: {
      connected: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      project_ref: projectRef,
      dashboard_url: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : 'https://supabase.com/dashboard',
    },
    vercel: {
      connected: !!process.env.VERCEL,
      commit_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env: process.env.VERCEL_ENV ?? null,
      dashboard_url: 'https://vercel.com/dashboard',
    },
  };

  const me = profile.id;

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Settings' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Settings</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">Studio defaults, branding, integrations, team.</p>
        </div>
        <AdminSettingsTabs
          settings={settings}
          integrations={integrations}
          team={team}
          currentUserId={me}
        />
      </div>
    </>
  );
}

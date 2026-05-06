'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/welcomeEmail';

type Provider = 'google' | 'github' | 'linkedin_oidc';

function siteOrigin(reqHeaders: Awaited<ReturnType<typeof headers>>) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const next = String(formData.get('next') ?? '/auth/redirect');
  if (!email) redirect('/login?error=missing_email');

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
}

export async function signInWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/auth/redirect');
  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent('Email and password are required.')}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent('Invalid email or password.')}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect('/auth/forgot-password?error=missing_email');

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset`,
  });

  redirect(`/auth/forgot-password?sent=1&email=${encodeURIComponent(email)}`);
}

export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');

  if (!password || password.length < 8) {
    redirect(
      `/auth/reset?error=${encodeURIComponent('Password must be at least 8 characters.')}`,
    );
  }
  if (password !== confirm) {
    redirect(`/auth/reset?error=${encodeURIComponent('Passwords do not match.')}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/auth/redirect');
}

export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = String(formData.get('provider') ?? '') as Provider;
  const next = String(formData.get('next') ?? '/auth/redirect');
  if (!['google', 'github', 'linkedin_oidc'].includes(provider)) {
    redirect('/login?error=invalid_provider');
  }

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'oauth_failed')}`);
  }

  redirect(data.url);
}

export async function signUpWithMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();
  const roleInCompany = String(formData.get('role_in_company') ?? '').trim();
  const goals = formData.getAll('goals').map((g) => String(g)).filter(Boolean);
  if (!email) redirect('/signup?error=missing_email');

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      shouldCreateUser: true,
      data: {
        full_name: fullName,
        company,
        role_in_company: roleInCompany,
        goals,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  try {
    const sb = supabaseAdmin();
    await sb
      .from('profiles')
      .update({ full_name: fullName, company, role_in_company: roleInCompany })
      .eq('email', email);
  } catch {
    // Non-fatal — the next callback can still complete sign-in.
  }

  // Fire-and-forget welcome email; never block signup on send failures.
  void sendWelcomeEmail({ to: email, fullName }).catch(() => undefined);

  redirect(`/onboarding?email=${encodeURIComponent(email)}&pending=1`);
}

export async function signUpWithPassword(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();
  const roleInCompany = String(formData.get('role_in_company') ?? '').trim();
  const goals = formData.getAll('goals').map((g) => String(g)).filter(Boolean);

  if (!email) redirect('/signup?error=missing_email');
  if (!password || password.length < 8) {
    redirect(`/signup?step=1&email=${encodeURIComponent(email)}&error=${encodeURIComponent('Password must be at least 8 characters.')}`);
  }

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: {
        full_name: fullName,
        company,
        role_in_company: roleInCompany,
        goals,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  try {
    const sb = supabaseAdmin();
    await sb
      .from('profiles')
      .update({ full_name: fullName, company, role_in_company: roleInCompany })
      .eq('email', email);
  } catch {
    // Non-fatal.
  }

  void sendWelcomeEmail({ to: email, fullName }).catch(() => undefined);

  redirect(`/onboarding?email=${encodeURIComponent(email)}&pending=1`);
}

export async function resendVerification(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect('/onboarding?error=missing_email');

  const supabase = await createSupabaseServerClient();
  const h = await headers();
  const origin = siteOrigin(h);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(`/onboarding?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/onboarding?email=${encodeURIComponent(email)}&resent=1`);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function adminInviteUser(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const appRole = String(formData.get('app_role') ?? 'client');

  if (!email) redirect('/admin/users?error=missing_email');
  if (!['client', 'admin'].includes(appRole)) {
    redirect('/admin/users?error=invalid_role');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sb = supabaseAdmin();
  const { data: caller } = await sb
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  if (caller?.app_role !== 'admin') redirect('/portal');

  const h = await headers();
  const origin = siteOrigin(h);

  const { data: invited, error } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/reset`,
    data: { full_name: fullName, invited_by: user.id },
  });

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  if (invited?.user) {
    await sb.from('profiles').upsert({
      id: invited.user.id,
      email,
      full_name: fullName || null,
      app_role: appRole,
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    });
  }

  redirect(`/admin/users?invited=${encodeURIComponent(email)}`);
}

export async function approveProfile(formData: FormData): Promise<void> {
  const targetId = String(formData.get('id') ?? '');
  if (!targetId) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify caller is admin via service-role lookup (bypasses RLS recursion concerns).
  const sb = supabaseAdmin();
  const { data: caller } = await sb
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle();
  if (caller?.app_role !== 'admin') redirect('/portal/home');

  await sb
    .from('profiles')
    .update({
      approval_status: 'approved',
      app_role: 'client',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', targetId);

  redirect('/admin');
}

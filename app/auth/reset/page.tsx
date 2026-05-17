import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updatePassword } from '@/app/auth/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { GradientMesh } from '@/components/auth/gradient-mesh';

export const metadata = {
  title: 'Set a new password · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;
  const error = sp.error;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/forgot-password?error=session_expired');
  }

  return (
    <div className="relative min-h-screen flex bg-[#09090B]">
      <GradientMesh />
      <div className="relative z-10 flex flex-1">
        <BrandPanel />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 text-[#FAFAFA] mb-8">
              <SageLogo />
              <span className="font-semibold">Sage Ideas Studio</span>
            </div>

            <div className="space-y-2 mb-8">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
                Account recovery
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
                Set a new password
              </h2>
              <p className="text-sm text-[#A8A29E]">
                Choose a new password for{' '}
                <span className="font-medium text-[#FAFAFA]">{user.email}</span>.
              </p>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-[#7F1D1D]/50 bg-[#7F1D1D]/10 px-3 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {decodeURIComponent(error)}
                </div>
              )}
            </div>

            <form action={updatePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2"
                >
                  New password (min 8 chars)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#0ED3CF] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0AA8A5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
              >
                Update password
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-[#A8A29E]">
              <Link
                href="/login"
                className="text-[#0ED3CF] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 rounded-sm"
              >
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { resendVerification } from '@/app/auth/actions';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { GradientMesh } from '@/components/auth/gradient-mesh';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Welcome · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    email?: string;
    pending?: string;
    resent?: string;
    error?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = sp.email ?? user?.email ?? '';
  const resent = sp.resent === '1';
  const error = sp.error;
  const verified = !!user;

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

            <div className="space-y-2 mb-6">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
                {verified ? 'Email verified' : 'Almost there'}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
                {verified ? 'You’re in the queue' : 'Check your inbox to verify'}
              </h2>
              <p className="text-sm text-[#A8A29E] leading-relaxed">
                {verified ? (
                  <>
                    Your email is verified. An admin reviews every request manually — usually
                    within 24 hours. We’ll email{' '}
                    <span className="font-medium text-[#FAFAFA]">{email}</span> the moment your
                    workspace is ready.
                  </>
                ) : (
                  <>
                    We sent a verification link to{' '}
                    <span className="font-medium text-[#FAFAFA]">{email || 'your email'}</span>.
                    Click it to confirm, then we’ll review your access.
                  </>
                )}
              </p>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-[#7F1D1D]/50 bg-[#7F1D1D]/10 px-3 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {decodeURIComponent(error)}
                </div>
              )}
              {resent && (
                <div
                  role="status"
                  className="mb-4 rounded-lg border border-[#0ED3CF]/30 bg-[#0ED3CF]/5 px-3 py-2.5 text-sm text-[#A5F3FC]"
                >
                  New verification link sent. Check your inbox.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-4 space-y-2 mb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
                What happens next
              </div>
              <ol className="space-y-1.5 text-xs text-[#A8A29E] list-decimal list-inside">
                <li>Click the verification link in your inbox.</li>
                <li>An admin reviews your request manually (typically same business day).</li>
                <li>You get an approval email; sign in and land in your workspace.</li>
              </ol>
            </div>

            {!verified && email && (
              <form action={resendVerification} className="mb-5">
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-sm font-medium text-[#FAFAFA] hover:border-[#0ED3CF]/50 hover:bg-[#131316] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 transition-colors"
                >
                  Resend verification email
                </button>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/"
                className="flex-1 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-center text-sm font-medium text-[#FAFAFA] hover:border-[#3F3F46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
              >
                ← Back to homepage
              </Link>
              <Link
                href="/login"
                className="flex-1 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-center text-sm font-medium text-[#FAFAFA] hover:border-[#3F3F46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { signInWithPassword } from '@/app/auth/actions';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { GradientMesh } from '@/components/auth/gradient-mesh';

export const metadata = {
  title: 'Sign in · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const error = sp.error;
  const next = sp.next ?? '/auth/redirect';
  const signupHref =
    next !== '/auth/redirect' ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

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
                Studio access. Built for clients and craft.
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
                Sign in to the studio
              </h2>
              <p className="text-sm text-[#A8A29E]">
                Use the email and password tied to your engagement, or continue with a connected
                account.
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

            <form action={signInWithPassword} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-2"
                >
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]"
                  >
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-[#0ED3CF] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 rounded-sm"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#0ED3CF] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0AA8A5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
              >
                Sign in
              </button>
            </form>

            <div className="my-6 flex items-center gap-3" role="separator" aria-hidden>
              <div className="flex-1 h-px bg-[#2A2826]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525B]">
                or continue with
              </span>
              <div className="flex-1 h-px bg-[#2A2826]" />
            </div>

            <OAuthButtons next={next} />

            <p className="mt-8 text-center text-sm text-[#A8A29E]">
              New here?{' '}
              <Link
                href={signupHref}
                className="text-[#0ED3CF] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 rounded-sm"
              >
                Create an account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

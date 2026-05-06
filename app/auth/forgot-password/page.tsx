import Link from 'next/link';
import { requestPasswordReset } from '@/app/auth/actions';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { GradientMesh } from '@/components/auth/gradient-mesh';

export const metadata = {
  title: 'Reset password · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ sent?: string; email?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sent = sp.sent === '1';
  const sentEmail = sp.email ?? '';
  const error = sp.error;

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
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4]">
                Account recovery
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
                Reset your password
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Enter the email tied to your account and we&apos;ll send you a reset link.
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

            {sent ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/5 px-5 py-6 space-y-3"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4]">
                  Check your inbox
                </div>
                <p className="text-sm text-[#FAFAFA]">
                  If an account exists for{' '}
                  <span className="font-medium">{sentEmail}</span>, we&apos;ve sent a reset link.
                </p>
                <p className="text-xs text-[#71717A]">
                  The link expires in 1 hour. Didn&apos;t get it? Check spam, then{' '}
                  <Link
                    href="/auth/forgot-password"
                    className="text-[#06B6D4] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 rounded-sm"
                  >
                    request a new one
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form action={requestPasswordReset} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-mono uppercase tracking-widest text-[#71717A] mb-2"
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
                    className="w-full rounded-lg border border-[#27272A] bg-[#0A0A0C] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#06B6D4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#06B6D4] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0891B2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
                >
                  Send reset link
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-sm text-[#A1A1AA]">
              <Link
                href="/login"
                className="text-[#06B6D4] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 rounded-sm"
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

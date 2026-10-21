import Link from 'next/link';
import { signInWithPassword } from '@/app/auth/actions';
import { AuthShell, AuthSubmit, authFieldClass } from '@/components/auth/auth-shell';
import { AcademyValuePanel } from '@/components/auth/academy-value-panel';
import { AcademyAuth } from '@/components/auth/academy-auth';

export const metadata = {
  title: 'Sign in · Sage Ideas',
  description: 'Secure client and studio access for Sage Ideas engagements.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    audience?: string;
    mode?: string;
    email?: string;
  }>;
};

const COPY = {
  studio: {
    kicker: 'Studio access',
    heading: 'Welcome back to the studio.',
    sub: 'Sign in with the email tied to your engagement, or continue with a connected account.',
    signUpLabel: 'Request access',
  },
} as const;

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const error = sp.error?.slice(0, 300);
  const email = sp.email?.slice(0, 320);
  const next = sp.next ?? '/auth/redirect';
  const audience: 'studio' | 'academy' =
    sp.audience === 'academy' || next.startsWith('/academy') ? 'academy' : 'studio';

  // ── Academy audience → the Sage Academy split-screen design (Create / Log in tabs). ──
  if (audience === 'academy') {
    const academyNext = next.startsWith('/academy') ? next : '/academy/dashboard';
    const initialMode = sp.mode === 'signup' ? 'signup' : 'login';
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0B0B0E',
          color: '#F2EFE9',
          fontFamily: "var(--ac-font-body, 'Hanken Grotesk', system-ui, sans-serif)",
          fontSize: 16,
          lineHeight: 1.6,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          overflowX: 'hidden',
        }}
      >
        <AcademyValuePanel />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px)',
          }}
        >
          <AcademyAuth
            audience="academy"
            initialMode={initialMode}
            next={academyNext}
            error={error}
            email={email}
            forgotHref="/auth/forgot-password"
            crossLink={{ href: '/login', label: 'studio client? sign in here →' }}
          />
        </div>
      </main>
    );
  }

  // ── Studio audience → existing studio shell (unchanged behaviour). ──
  const c = COPY.studio;
  const signInHref = '/login';
  const signUpHref =
    next !== '/auth/redirect' ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  return (
    <AuthShell
      audience="studio"
      mode="signin"
      kicker={c.kicker}
      heading={c.heading}
      sub={c.sub}
      error={error}
      next={next}
      signInHref={signInHref}
      signUpHref={signUpHref}
      signUpLabel={c.signUpLabel}
      footer={
        <p className="text-[12px] text-[#52525B]">
          <Link
            href="/login?audience=academy&next=/academy/dashboard"
            className="hover:text-[#9C9CA6] transition-colors"
          >
            Here to learn? Academy sign-in →
          </Link>
        </p>
      }
    >
      <form action={signInWithPassword} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label
            htmlFor="email"
            className="block text-[11px] font-mono uppercase tracking-[0.14em] text-[#8A8A94] mb-1.5"
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
            className={authFieldClass}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="password" className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#8A8A94]">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[12px] text-[#9C9CA6] hover:text-white transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className={authFieldClass}
          />
        </div>
        <AuthSubmit>Sign in</AuthSubmit>
      </form>
    </AuthShell>
  );
}

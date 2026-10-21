import Link from 'next/link';
import { signUpAcademy } from '@/app/auth/actions';
import { AuthShell, AuthSubmit, authFieldClass } from '@/components/auth/auth-shell';
import { Icon } from '@/components/academy/ui/Icon';
import { getT } from '@/lib/i18n/t';

export const metadata = {
  title: 'Join Sage Academy',
  description: 'Create your free Sage Academy account and start building.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ error?: string; email?: string }> };

export default async function AcademySignupPage({ searchParams }: Props) {
  const sp = await searchParams;
  const error = sp.error?.slice(0, 300);
  const t = await getT();

  return (
    <AuthShell
      audience="academy"
      mode="signup"
      kicker={t('Free account · verified access')}
      heading={t('Start building today.')}
      sub={t('Create a free account, verify your email, and keep what you build. Paid enrollment remains closed until the Academy is certified.')}
      error={error}
      next="/academy/dashboard"
      signInHref="/login?audience=academy&next=/academy/dashboard"
      signUpHref="/academy/signup"
      signUpLabel={t('Create account')}
      footer={
        <p className="text-[12px] text-[#52525B]">
          <Link href="/academy" className="inline-flex items-center gap-1.5 hover:text-[#9C9CA6] transition-colors">
            <Icon name="arrow-left" size={13} aria-hidden="true" /> {t('Back to the Academy')}
          </Link>
        </p>
      }
    >
      <form action={signUpAcademy} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-[11px] font-mono uppercase tracking-[0.14em] text-[#8A8A94] mb-1.5">
            {t('Name')} <span className="opacity-50 normal-case tracking-normal">{t('(optional)')}</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder={t('Your name')}
            className={authFieldClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-[11px] font-mono uppercase tracking-[0.14em] text-[#8A8A94] mb-1.5">
            {t('Email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={sp.email ?? ''}
            placeholder={t('you@email.com')}
            className={authFieldClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[11px] font-mono uppercase tracking-[0.14em] text-[#8A8A94] mb-1.5">
            {t('Password')} <span className="opacity-50 normal-case tracking-normal">{t('(8+ characters)')}</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={authFieldClass}
          />
        </div>
        <AuthSubmit>
          <span className="inline-flex items-center gap-1.5">
            {t('Create account & start')} <Icon name="arrow-right" size={14} aria-hidden="true" />
          </span>
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}

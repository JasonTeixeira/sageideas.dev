import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { GradientMesh } from '@/components/auth/gradient-mesh';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { getT } from '@/lib/i18n/t';

type Audience = 'studio' | 'academy';

const THEME: Record<Audience, { bg: string; accent: string; mobileLabel: string }> = {
  studio: { bg: '#09090B', accent: '#3D5AFE', mobileLabel: 'Sage Ideas Studio' },
  academy: { bg: '#080A09', accent: '#3D6BFF', mobileLabel: 'Sage Academy' },
};

/** Shared input styling. Focus behaviour is driven by the scoped CSS in AuthShell. */
export const authFieldClass =
  'auth-field w-full rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-3 text-[15px] text-white placeholder:text-[#52525B]';

/** Accent-filled primary submit (colour comes from the card's --accent var). */
export function AuthSubmit({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="auth-submit w-full rounded-xl px-4 py-3 text-[15px] font-semibold transition active:translate-y-px"
    >
      {children}
    </button>
  );
}

interface AuthShellProps {
  audience: Audience;
  mode: 'signin' | 'signup';
  kicker: string;
  heading: string;
  sub: string;
  error?: string;
  next?: string;
  signInHref: string;
  signUpHref: string;
  signUpLabel: string;
  /** The form (fields + AuthSubmit). */
  children: ReactNode;
  footer?: ReactNode;
  oauth?: boolean;
}

export async function AuthShell({
  audience,
  mode,
  kicker,
  heading,
  sub,
  error,
  next,
  signInHref,
  signUpHref,
  signUpLabel,
  children,
  footer,
  oauth = true,
}: AuthShellProps) {
  const theme = THEME[audience];
  const t = await getT();
  const seg = 'relative rounded-lg py-2 text-center text-[13px] font-medium transition';

  return (
    <main className="relative min-h-screen flex" style={{ background: theme.bg }}>
      <GradientMesh />
      <div className="relative z-10 flex flex-1">
        <BrandPanel audience={audience} />

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="auth-card w-full max-w-[440px]" style={{ ['--accent']: theme.accent } as CSSProperties}>
            <style>{`
              .auth-card .auth-field { transition: border-color .15s, box-shadow .15s, background .15s; box-shadow: inset 0 1px 2px rgba(0,0,0,.28); }
              .auth-card .auth-field:focus { outline: none; border-color: var(--accent); background: rgba(0,0,0,.62); box-shadow: inset 0 1px 2px rgba(0,0,0,.28), 0 0 0 4px color-mix(in oklab, var(--accent) 16%, transparent); }
              .auth-card .auth-submit { background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 86%, white 14%), var(--accent)); color: #06120c; box-shadow: inset 0 1px 0 rgba(255,255,255,.30), 0 12px 32px -12px color-mix(in oklab, var(--accent) 66%, transparent); }
              .auth-card .auth-submit:hover { filter: brightness(1.06) saturate(1.04); }
              .auth-card .auth-submit:active { transform: translateY(0.5px); }
              .auth-card .auth-submit:focus-visible { outline: 2px solid rgba(255,255,255,.5); outline-offset: 2px; }
              .auth-card .auth-seg-on { background: color-mix(in oklab, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--accent) 34%, transparent), 0 1px 0 rgba(255,255,255,.04); }
              .auth-card .auth-surface { position: relative; box-shadow: 0 40px 120px -30px rgba(0,0,0,.85), 0 0 90px -52px color-mix(in oklab, var(--accent) 50%, transparent); }
              .auth-card .auth-surface::before { content: ''; position: absolute; left: 14%; right: 14%; top: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent); pointer-events: none; }
            `}</style>

            <div className="auth-surface rounded-2xl border border-white/[0.09] bg-[#0c0c10]/80 backdrop-blur-xl p-7 sm:p-9">
              <div className="lg:hidden flex items-center gap-2.5 text-white mb-7">
                <SageLogo className="w-8 h-8" />
                <span className="font-semibold text-[15px]">{t(theme.mobileLabel)}</span>
              </div>

              {/* Sign in / Create account toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06] mb-7">
                <Link
                  href={signInHref}
                  aria-current={mode === 'signin' ? 'page' : undefined}
                  className={`${seg} ${mode === 'signin' ? 'auth-seg-on' : 'text-[#8A8A94] hover:text-white'}`}
                >
                  {t('Sign in')}
                </Link>
                <Link
                  href={signUpHref}
                  aria-current={mode === 'signup' ? 'page' : undefined}
                  className={`${seg} ${mode === 'signup' ? 'auth-seg-on' : 'text-[#8A8A94] hover:text-white'}`}
                >
                  {signUpLabel}
                </Link>
              </div>

              <div className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2.5" style={{ color: theme.accent }}>
                  {kicker}
                </div>
                <h1
                  style={{ fontFamily: 'var(--font-serif)' }}
                  className="text-[27px] sm:text-[30px] leading-[1.08] tracking-[-0.02em] text-white"
                >
                  {heading}
                </h1>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#9C9CA6]">{sub}</p>
              </div>

              <div aria-live="polite" aria-atomic="true">
                {error && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3.5 py-2.5 text-[13px] text-red-300"
                  >
                    {error}
                  </div>
                )}
              </div>

              {children}

              {oauth && (
                <>
                  <div className="my-6 flex items-center gap-3" aria-hidden>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#52525B]">
                      {t('or continue with')}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                  </div>
                  <OAuthButtons next={next} />
                </>
              )}

              {footer && <div className="mt-7 text-center">{footer}</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

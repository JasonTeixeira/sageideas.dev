'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  signInWithPassword,
  signInWithProvider,
  signUpAcademy,
  signUpWithPassword,
} from '@/app/auth/actions';

type Audience = 'studio' | 'academy';
type Mode = 'signup' | 'login';

interface AcademyAuthProps {
  audience: Audience;
  /** Initial tab. */
  initialMode: Mode;
  /** Post-auth destination (sanitized server-side too). */
  next: string;
  /** Decoded error message from the query string, if any. */
  error?: string;
  /** Prefill for the email input (e.g. bounced back from a failed attempt). */
  email?: string;
  /** Forgot-password link target. */
  forgotHref: string;
  /** Cross-audience footer link (label + href). */
  crossLink: { href: string; label: string };
}

/* ── Fixed dark palette (design spec — deliberately literal, not theme-derived) ── */
const C = {
  bg: '#0B0B0E',
  panel: '#0D0D11',
  surface: '#111115',
  field: '#0F0F13',
  text: '#F2EFE9',
  muted: '#9598A2',
  line: '#1E1E24',
  fieldLine: '#2A2A33',
  accent: '#3D5AFE',
  accentInk: '#8FA0FF',
  green: '#18B663',
  faint: '#4A4A54',
  dim: '#B6B6C0',
} as const;

const FONT_DISPLAY = 'var(--ac-font-display, Fraunces, Georgia, serif)';
const FONT_MONO = "var(--ac-font-mono, 'JetBrains Mono', ui-monospace, monospace)";

function GitHubMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a10.96 10.96 0 0 1 5.74 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.79.56C20.21 21.39 23.5 17.08 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function AcademyAuth({
  audience,
  initialMode,
  next,
  error,
  email,
  forgotHref,
  crossLink,
}: AcademyAuthProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const signup = mode === 'signup';

  const title = signup ? 'Start building proof.' : 'Welcome back.';
  const subtitle = signup
    ? 'Two fields, then a two-minute setup — no card required.'
    : 'Your ledger is where you left it.';
  const pwPlaceholder = signup ? 'choose a password (8+ characters)' : 'your password';
  const pwAutoComplete = signup ? 'new-password' : 'current-password';
  const submitLabel = signup ? 'Create my account →' : 'Log in →';

  // Real server actions. Academy signup requires email confirmation; studio
  // signup enters the manually reviewed client-access flow.
  const submitAction = signup
    ? audience === 'academy'
      ? signUpAcademy
      : signUpWithPassword
    : signInWithPassword;

  const tab = (m: Mode, label: string) => {
    const on = mode === m;
    return (
      <button
        type="button"
        onClick={() => setMode(m)}
        aria-pressed={on}
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          padding: 10,
          borderRadius: 9,
          cursor: 'pointer',
          border: 'none',
          userSelect: 'none',
          transition: 'color .15s, background .15s',
          color: on ? C.text : C.muted,
          background: on ? 'rgba(61,90,254,0.18)' : 'transparent',
        }}
      >
        {label}
      </button>
    );
  };

  const oauthBtn = (
    provider: 'github' | 'google',
    mark: React.ReactNode,
    label: string,
  ) => (
    <form action={signInWithProvider} style={{ display: 'contents' }}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="acad-oauth"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          width: '100%',
          border: `1px solid ${C.fieldLine}`,
          borderRadius: 10,
          padding: 12,
          fontSize: 13.5,
          fontWeight: 600,
          color: C.text,
          background: 'transparent',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          transition: 'border-color .15s, background .15s',
        }}
      >
        {mark}
        {label}
      </button>
    </form>
  );

  return (
    <div style={{ width: 'min(400px, 100%)' }}>
      <style>{`
        .acad-oauth:hover { border-color: rgba(255,255,255,0.24) !important; background: rgba(255,255,255,0.04) !important; }
        .acad-oauth:focus-visible, .acad-field:focus, .acad-submit:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        .acad-field { transition: border-color .15s, box-shadow .15s; }
        .acad-field:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px rgba(61,90,254,0.16); }
        .acad-field::placeholder { color: ${C.faint}; }
        .acad-submit:hover { filter: brightness(1.07) saturate(1.03); }
        .acad-submit:active { transform: translateY(0.5px); }
      `}</style>

      {/* Create account / Log in tabs */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        style={{
          display: 'flex',
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 26,
        }}
      >
        {tab('signup', 'Create account')}
        {tab('login', 'Log in')}
      </div>

      <h1
        style={{
          margin: '0 0 6px',
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: 27,
          letterSpacing: '-0.02em',
          color: C.text,
        }}
      >
        {title}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#9C9CA6' }}>{subtitle}</p>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            margin: '0 0 18px',
            borderRadius: 10,
            border: '1px solid rgba(224,169,62,0.45)',
            background: 'rgba(224,169,62,0.08)',
            padding: '11px 14px',
            fontSize: 13,
            color: '#E4C07C',
          }}
        >
          {error}
        </div>
      )}

      {/* OAuth — REAL providers routed through signInWithProvider. Design shows GitHub + Google. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {oauthBtn('github', <GitHubMark />, 'GitHub')}
        {oauthBtn('google', <GoogleMark />, 'Google')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span style={{ flex: 1, borderTop: `1px solid ${C.line}` }} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.faint }}>or with email</span>
        <span style={{ flex: 1, borderTop: `1px solid ${C.line}` }} />
      </div>

      {/* Email/password — posts to the REAL server action for the active tab. */}
      <form action={submitAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="hidden" name="next" value={next} />
        {signup && audience === 'studio' && (
          <input type="hidden" name="full_name" value="" />
        )}
        <label htmlFor="email" className="sr-only" style={srOnly}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={email ?? ''}
          placeholder="you@work.dev"
          className="acad-field"
          style={fieldStyle}
        />
        <label htmlFor="password" className="sr-only" style={srOnly}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={pwAutoComplete}
          placeholder={pwPlaceholder}
          className="acad-field"
          style={fieldStyle}
        />

        {!signup && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
            <Link
              href={forgotHref}
              style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted, textDecoration: 'none' }}
            >
              forgot your password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          className="acad-submit"
          style={{
            display: 'flex',
            justifyContent: 'center',
            color: '#FFFFFF',
            background: C.accent,
            fontSize: 15,
            fontWeight: 600,
            padding: 14,
            borderRadius: 24,
            cursor: 'pointer',
            border: 'none',
            fontFamily: 'inherit',
            boxShadow: '0 0 22px rgba(61,90,254,0.35)',
            whiteSpace: 'nowrap',
            transition: 'filter .15s, transform .05s',
          }}
        >
          {submitLabel}
        </button>
      </form>

      <p
        style={{
          margin: '18px 0 0',
          fontSize: 12,
          color: C.faint,
          textAlign: 'center',
        }}
      >
        {signup
          ? 'Free to create an account — lesson 07 is open before you ever pay. By continuing you agree to the terms; cancel anytime, no lock-in.'
          : 'Signing in keeps your ledger, progress, and certificates right where you left them.'}
      </p>

      <p style={{ margin: '14px 0 0', textAlign: 'center' }}>
        <Link
          href={crossLink.href}
          style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.faint, textDecoration: 'none' }}
        >
          {crossLink.label}
        </Link>
      </p>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: '#0F0F13',
  border: '1px solid #2A2A33',
  borderRadius: 10,
  padding: '13px 16px',
  fontSize: 14.5,
  color: '#F2EFE9',
  fontFamily: 'inherit',
  outline: 'none',
};

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

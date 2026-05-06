/**
 * Phase 0 — Sentry server SDK init (Node runtime).
 *
 * No-op when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN are unset.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // The server runtime is privileged — be aggressive about scrubbing.
    sendDefaultPii: false,
  });
}

/**
 * Phase 0 — Sentry browser SDK init.
 *
 * No-op when NEXT_PUBLIC_SENTRY_DSN is unset (so local/dev/preview
 * without a DSN behaves exactly like before).
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? undefined,
    // Conservative defaults — tune via Phase 5.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.5,
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
    // Don't ship noisy framework-level errors that we can't action.
    ignoreErrors: [
      /ResizeObserver loop limit exceeded/,
      /Non-Error promise rejection captured/,
      /^Network request failed$/,
    ],
  });
}

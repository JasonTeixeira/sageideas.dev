/**
 * Phase 0 — Next.js instrumentation hook.
 *
 * Loads the right Sentry runtime config based on which Node/Edge environment
 * the request is running in. Required for `@sentry/nextjs` v8+.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';

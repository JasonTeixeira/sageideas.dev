/**
 * Phase 2F PR-A — query budget instrumentation.
 *
 * Wrap a Supabase / PostgREST query expression and warn (in production) when
 * a single round-trip exceeds the configured budget. Returns the awaited
 * result unchanged so call sites stay readable.
 *
 *   const { data } = await timed('engagement.detail', sb.from('engagements')...);
 */

const DEFAULT_BUDGET_MS = 500;

export async function timed<T>(
  label: string,
  promise: PromiseLike<T>,
  budgetMs: number = DEFAULT_BUDGET_MS,
): Promise<T> {
  const t0 =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  try {
    return await promise;
  } finally {
    const t1 =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const elapsed = Math.round(t1 - t0);
    if (elapsed > budgetMs) {
      // Always warn — runs in node SSR, so visible in Vercel logs.
      console.warn(
        `[db-timing] slow query: ${label} took ${elapsed}ms (budget ${budgetMs}ms)`,
      );
    }
  }
}

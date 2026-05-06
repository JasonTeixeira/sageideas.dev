import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Phase 0 — health endpoint.
 *
 * Surface area:
 *   - HTTP 200 when the build is reachable AND Supabase responds within timeout
 *   - HTTP 503 if any required check fails
 *
 * Payload:
 *   - sha          → Vercel commit SHA (or 'local')
 *   - environment  → Vercel env (production / preview / development / local)
 *   - region       → Vercel deployment region
 *   - checks.db    → 'ok' | 'fail' (anonymous Supabase ping with HEAD count on contract_templates)
 *   - checks.auth  → 'ok' | 'fail' (Supabase auth health endpoint)
 *   - checks.env   → 'ok' | 'fail' (required env vars present)
 *   - latency_ms   → per-check timings
 *
 * Safe to expose publicly: no secrets, no PII, no row data.
 */

type CheckResult = { status: 'ok' | 'fail'; latency_ms: number; error?: string };

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T | null; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - start };
  } catch (e) {
    return { value: null, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkDb(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: 'fail', latency_ms: 0, error: 'missing supabase env' };

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { ms, error } = await timed(async () => {
    // HEAD count is cheap and respects RLS — anonymous read of contract_templates is allowed by current policy.
    const { error } = await sb
      .from('contract_templates')
      .select('id', { head: true, count: 'exact' });
    if (error) throw new Error(error.message);
    return true;
  });

  return error ? { status: 'fail', latency_ms: ms, error } : { status: 'ok', latency_ms: ms };
}

async function checkAuth(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { status: 'fail', latency_ms: 0, error: 'missing supabase url' };
  const { ms, error } = await timed(async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${url}/auth/v1/health`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`auth health http ${res.status}`);
      return true;
    } finally {
      clearTimeout(t);
    }
  });
  return error ? { status: 'fail', latency_ms: ms, error } : { status: 'ok', latency_ms: ms };
}

function checkEnv(): CheckResult {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    return { status: 'fail', latency_ms: 0, error: `missing: ${missing.join(',')}` };
  }
  return { status: 'ok', latency_ms: 0 };
}

export async function GET() {
  const [db, auth] = await Promise.all([checkDb(), checkAuth()]);
  const env = checkEnv();

  const overall: 'ok' | 'degraded' | 'fail' =
    db.status === 'ok' && auth.status === 'ok' && env.status === 'ok'
      ? 'ok'
      : db.status === 'fail' || env.status === 'fail'
      ? 'fail'
      : 'degraded';

  const body = {
    status: overall,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    environment: process.env.VERCEL_ENV ?? 'local',
    region: process.env.VERCEL_REGION ?? null,
    timestamp: new Date().toISOString(),
    checks: {
      db,
      auth,
      env,
    },
  };

  const statusCode = overall === 'fail' ? 503 : 200;
  return NextResponse.json(body, {
    status: statusCode,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

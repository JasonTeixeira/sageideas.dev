#!/usr/bin/env node
/*
  Production verification for the synthetic monitor.

  Checks (Vercel-only deployment):
  - /api/health is reachable and returns status !== 'fail'
  - /api/quality returns a valid live/snapshot payload (default mode)
  - /api/quality?mode=snapshot returns a valid snapshot payload

  Usage:
    node scripts/verify-prod.mjs

  Env overrides:
    SITE_URL=https://sageideas.dev
*/

const SITE_URL = process.env.SITE_URL || 'https://sageideas.dev';

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        'user-agent': 'qa-portfolio-prod-verify/1.0',
        ...(opts.headers || {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

function validateQualitySnapshot(payload, modeLabel) {
  expect(payload && typeof payload === 'object', `${modeLabel}: response is not an object`);
  expect(payload.summary && typeof payload.summary === 'object', `${modeLabel}: missing summary`);
  expect(typeof payload.generatedAt === 'string', `${modeLabel}: generatedAt missing`);
  expect(Array.isArray(payload.projects), `${modeLabel}: projects is not an array`);
  expect(payload.projects.length > 0, `${modeLabel}: projects array is empty`);
}

async function main() {
  console.log(`Verifying production at ${SITE_URL}`);

  // 1) Health endpoint — public, follows apex→www redirect.
  {
    const res = await fetchWithTimeout(`${SITE_URL}/api/health`, {
      redirect: 'follow',
      headers: { accept: 'application/json' },
    });
    expect(res.ok, `/api/health not OK (status ${res.status})`);
    const json = await res.json().catch(() => null);
    expect(json && typeof json === 'object', '/api/health returned non-JSON body');
    expect(json?.status !== 'fail', `/api/health status=${json?.status} (expected ok|degraded)`);
    ok(`/api/health reachable (status=${json?.status}, sha=${json?.sha ?? 'n/a'})`);
  }

  // 2) Quality (default / live mode).
  {
    const res = await fetchWithTimeout(`${SITE_URL}/api/quality`, {
      redirect: 'follow',
      headers: { accept: 'application/json' },
    });
    expect(res.ok, `/api/quality not OK (status ${res.status})`);
    const json = await res.json();
    validateQualitySnapshot(json, 'quality');
    ok('/api/quality valid');
  }

  // 3) Quality (snapshot mode).
  {
    const res = await fetchWithTimeout(`${SITE_URL}/api/quality?mode=snapshot`, {
      redirect: 'follow',
      headers: { accept: 'application/json' },
    });
    expect(res.ok, `/api/quality?mode=snapshot not OK (status ${res.status})`);
    const json = await res.json();
    validateQualitySnapshot(json, 'snapshot');
    ok('/api/quality?mode=snapshot valid');
  }
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});

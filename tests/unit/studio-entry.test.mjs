import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadSource(path, dependencies, env = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, process: { env },
    require(name) {
      if (name in dependencies) return dependencies[name];
      return {};
    },
  });
  return exports.default;
}

async function dashboardOutcome(isAdmin, org, view) {
  let selectedOrg;
  const page = loadSource('app/portal/page.tsx', {
    'next/navigation': { redirect: (path) => { throw new Error(`redirect:${path}`); } },
    '@/lib/portal/auth': { getPortalContext: async (opts) => {
      selectedOrg = opts?.orgSlug;
      return { isAdmin, organizationId: null };
    } },
    '@/lib/supabase/server': { supabaseAdmin: () => { throw new Error('portal-render'); } },
  });
  let outcome;
  try { await page({ searchParams: Promise.resolve({ org, view }) }); }
  catch (error) { outcome = error.message; }
  return { outcome, selectedOrg };
}

test('admin opening the client dashboard lands in the admin cockpit', async () => {
  assert.equal((await dashboardOutcome(true)).outcome, 'redirect:/admin');
  assert.equal((await dashboardOutcome(true, '')).outcome, 'redirect:/admin');
});
test('approved clients retain their dashboard', async () => {
  assert.equal((await dashboardOutcome(false)).outcome, 'portal-render');
});
test('old organization dashboard links cannot open a second owner dashboard', async () => {
  assert.equal((await dashboardOutcome(true, 'acme')).outcome, 'redirect:/admin');
});

function config(env) {
  return loadSource('playwright.e2e.config.ts', {
    '@playwright/test': { defineConfig: (value) => value, devices: { 'Desktop Chrome': {} } },
  }, env);
}
test('E2E defaults to a local server, never production', () => {
  assert.equal(config({}).use.baseURL, 'http://127.0.0.1:3040');
});
test('E2E refuses production sites through either environment variable', () => {
  for (const key of ['PW_BASE_URL', 'BASE_URL']) {
    for (const host of ['www.sageideas.dev', 'sageideas.dev', 'agency.sageideas.dev', 'WWW.SAGEIDEAS.DEV.']) {
      assert.throws(() => config({ [key]: `https://${host}` }), /production/i);
    }
  }
});
test('E2E accepts explicit local and staging targets', () => {
  for (const url of ['http://localhost:3040', 'https://studio-staging.vercel.app']) {
    assert.equal(config({ PW_BASE_URL: url }).use.baseURL, url);
  }
});

test('repeated organization parameters use the first selection', async () => {
  assert.deepEqual(await dashboardOutcome(false, ['acme', 'beta']), { outcome: 'portal-render', selectedOrg: 'acme' });
});
test('old preview links cannot open a second owner dashboard', async () => {
  assert.equal((await dashboardOutcome(true, undefined, 'client')).outcome, 'redirect:/admin');
  const sidebar = readFileSync(new URL('../../components/admin/sidebar.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(sidebar, /Switch to portal|view=client/);
});

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest, NextResponse } from 'next/server.js';

function load(path, deps = {}, env = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URL, Headers, console, process: { env },
    require: (name) => deps[name] ?? {},
  });
  return exports;
}
const icons = new Proxy({}, { get: () => 'svg' });
function navModule() {
  const admin = load('components/admin/sidebar.tsx', { 'lucide-react': icons });
  let canonical = {};
  try { canonical = load('components/admin/nav-items.ts', { 'lucide-react': icons }); } catch { /* not extracted yet */ }
  return load('components/portal/nav-items.ts', {
    'lucide-react': icons, '@/components/admin/nav-items': canonical,
    '../admin/nav-items': canonical, '@/components/admin/sidebar': admin,
  });
}

test('owner navigation exposes one admin dashboard without a client dashboard', () => {
  const nav = navModule().getPortalNavItems({ isAdmin: true });
  assert.equal(nav.filter((item) => item.label === 'Dashboard').length, 1);
  assert.equal(nav.find((item) => item.label === 'Dashboard').href, '/admin');
  assert.ok(!nav.some((item) => item.href === '/portal'));
  assert.ok(nav.some((item) => item.href === '/admin/proposals'));
});
test('client navigation remains free of owner destinations', () => {
  const nav = navModule().getPortalNavItems();
  assert.equal(nav.find((item) => item.label === 'Dashboard').href, '/portal');
  assert.ok(!nav.some((item) => item.href.startsWith('/admin')));
});

test('owner portal detail pages reuse the owner sidebar', () => {
  const { Sidebar } = load('components/portal/sidebar.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => '/portal/messages/123' },
    '@/lib/utils': { cn: (...args) => args.join(' ') },
    './nav-items': navModule(),
    '@/components/admin/sidebar': { AdminSidebar: () => jsxRuntime.jsx('nav', { children: 'Canonical owner navigation' }) },
    'lucide-react': icons,
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(Sidebar, { isAdmin: true }));
  assert.match(html, /Canonical owner navigation/);
  assert.doesNotMatch(html, /Workspace|Admin · Pipeline/);
});

async function requestAs(path, role) {
  const { updateSession } = load('lib/supabase/middleware.ts', {
    'next/server': { NextResponse },
    '@supabase/ssr': { createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { app_role: role, approval_status: 'approved' } }) }) }) }),
    }) },
    '@/lib/studio-routing': (() => { try { return load('lib/studio-routing.ts'); } catch { return {}; } })(),
  }, { NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder', NODE_ENV: 'production' });
  return updateSession(new NextRequest(`https://www.sageideas.dev${path}`));
}
const aliases = {
  '/portal': '/admin', '/portal/home': '/admin', '/portal/projects': '/admin/pipeline',
  '/portal/engagements': '/admin/pipeline', '/portal/calendar': '/admin/calendar',
  '/portal/invoices': '/admin/invoices', '/portal/documents': '/admin/documents',
  '/portal/proposals': '/admin/proposals',
};
test('old owner entry points resolve to one canonical admin workspace', async () => {
  for (const [oldPath, newPath] of Object.entries(aliases)) {
    const response = await requestAs(`${oldPath}?view=client&org=acme&q=hello`, 'admin');
    const location = response.headers.get('location');
    assert.ok(location, `missing redirect for ${oldPath}`);
    const url = new URL(location);
    assert.equal(url.pathname, newPath);
    assert.equal(url.searchParams.get('q'), 'hello');
    assert.equal(url.searchParams.has('view'), false);
  }
});
test('clients keep all their existing workspace routes', async () => {
  for (const path of Object.keys(aliases)) {
    const response = await requestAs(path, 'client');
    assert.equal(response.headers.get('location'), null, path);
  }
});
test('owner detail links and MFA account settings remain reachable', async () => {
  for (const path of ['/portal/settings?mfa=required', '/portal/settings/audit-log', '/portal/projects/123', '/portal/proposals/123?token=example', '/portal/messages/123']) {
    const response = await requestAs(path, 'admin');
    assert.equal(response.headers.get('location'), null, path);
  }
});

test('mobile owner drawer renders the same single owner navigation', () => {
  const { MobileNav } = load('components/portal/mobile-nav.tsx', {
    react: { useState: () => [true, () => {}], useRef: () => ({ current: null }), useEffect: () => {}, useCallback: (fn) => fn },
    'react/jsx-runtime': jsxRuntime,
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => '/admin' },
    '@/lib/utils': { cn: (...args) => args.join(' ') },
    './nav-items': navModule(), 'lucide-react': icons,
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(MobileNav, { isAdmin: true }));
  assert.match(html, /href="\/admin"/);
  assert.match(html, /href="\/admin\/proposals"/);
  assert.doesNotMatch(html, /href="\/portal"|Admin · Pipeline/);
});

test('admin topbar exposes the canonical mobile navigation', () => {
  const { AdminTopbar } = load('components/admin/topbar.tsx', {
    'react/jsx-runtime': jsxRuntime, 'next/link': { default: 'a' },
    '@/lib/utils': { initials: () => 'S' },
    '@/components/portal/mobile-nav': { MobileNav: ({ isAdmin }) => jsxRuntime.jsx('button', { children: isAdmin ? 'Owner mobile navigation' : 'Client mobile navigation' }) },
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(AdminTopbar, { email: 'owner@example.com' }));
  assert.match(html, /Owner mobile navigation/);
});
test('owner command palette uses canonical navigation rather than client shortcuts', () => {
  const leaf = ({ children }) => jsxRuntime.jsx('div', { children });
  const Command = Object.assign(leaf, { Input: leaf, List: leaf, Empty: leaf, Group: leaf, Item: leaf });
  const { CommandPalette } = load('components/portal/command-palette.tsx', {
    react: { useState: () => [true, () => {}], useRef: () => ({ current: null }), useEffect: () => {}, useCallback: (fn) => fn },
    'react/jsx-runtime': jsxRuntime, 'next/navigation': { useRouter: () => ({ push: () => {} }) },
    cmdk: { Command }, 'lucide-react': icons, './nav-items': navModule(),
  });
  const html = renderToStaticMarkup(jsxRuntime.jsx(CommandPalette, { isAdmin: true, index: { projects: [], invoices: [], threads: [] } }));
  assert.match(html, /Proposals/);
  assert.match(html, /Account &amp; security/);
  assert.doesNotMatch(html, />Billing</);
});

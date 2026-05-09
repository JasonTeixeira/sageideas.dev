import { test, expect } from '@playwright/test';

// This suite aims to prevent "dead pages" by asserting every route renders and
// contains at least one unique high-signal element.

const staticRoutes: Array<{ path: string; mustContain: RegExp }> = [
  { path: '/', mustContain: /Jason Teixeira/i },
  { path: '/start', mustContain: /(Recruiter Mode|Start here)/i },
  { path: '/about', mustContain: /About/i },
  { path: '/platform', mustContain: /Quality Platform/i },
  { path: '/platform/quality-telemetry', mustContain: /Quality Telemetry Pipeline/i },
  { path: '/platform/ops-reliability', mustContain: /SLOs \+ Incident Drills/i },
  { path: '/platform/security-guardrails', mustContain: /Security & Guardrails/i },
  { path: '/platform/flagship-blueprint', mustContain: /Flagship Blueprint/i },
  { path: '/projects', mustContain: /Projects/i },
  { path: '/artifacts', mustContain: /Runbooks & Evidence/i },
  { path: '/blog', mustContain: /Blog/i },
  { path: '/contact', mustContain: /Contact/i },
];

// Dynamic inputs are defined in repo data files.
// Keep this test lightweight: verify the page 200s and shows the title.
const projectSlugs = [
  'selenium-python-framework',
  'api-testing-framework',
  'cicd-testing-pipeline',
  'performance-testing-suite',
  'mobile-testing-framework',
  'bdd-cucumber-framework',
  'visual-regression-testing-suite',
  'security-testing-suite',
];

const blogIds = ['1', '2', '3', '4', '5'];

test.describe('route coverage', () => {
  for (const r of staticRoutes) {
    test(`renders ${r.path}`, async ({ page }) => {
      await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('body')).toContainText(r.mustContain);
    });
  }

  test('resume route redirects to resume.pdf', async ({ request }) => {
    const res = await request.get('/resume', { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers()['location'] || '').toMatch(/\/resume\.pdf$/);
  });

  for (const slug of projectSlugs) {
    test(`renders project: ${slug}`, async ({ page }) => {
      await page.goto(`/projects/${slug}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
      // Project pages should have a GitHub link or at least show the project title.
      await expect(page.locator('body')).toContainText(/Case Study|Project|GitHub/i);
    });
  }

  for (const id of blogIds) {
    test(`renders blog post: ${id}`, async ({ page }) => {
      await page.goto(`/blog/${id}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
      // Ensure the post has substantial body content.
      await expect(page.locator('body')).toContainText(/\b(Framework|Testing|CI\/CD|Automation|Performance|Security)\b/i);
    });
  }
});

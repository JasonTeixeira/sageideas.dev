import { test, expect } from '@playwright/test';

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

const artifactPaths = [
  '/artifacts/recruiter-pack.zip',

  '/artifacts/playbooks/qa-1-page-playbook.md',
  '/artifacts/playbooks/flaky-test-triage-playbook.md',

  '/artifacts/templates/test-strategy-template.md',
  '/artifacts/templates/test-plan-template.md',
  '/artifacts/templates/risk-based-test-matrix.md',
  '/artifacts/templates/traceability-matrix.md',
  '/artifacts/templates/bug-report-template.md',
  '/artifacts/templates/release-signoff-template.md',

  '/artifacts/checklists/regression-checklist.md',
  '/artifacts/checklists/api-testing-checklist.md',
  '/artifacts/checklists/security-testing-checklist.md',
  '/artifacts/checklists/visual-testing-checklist.md',

  '/artifacts/examples/sample-bug-report.md',

  // Filled examples
  '/artifacts/filled/test-strategy-filled.md',
  '/artifacts/filled/test-plan-filled.md',
  '/artifacts/filled/release-signoff-filled.md',

  // Evidence screenshots
  '/artifacts/evidence/playwright-report.png',
  '/artifacts/evidence/allure-report.png',
  '/artifacts/evidence/lighthouse-ci.png',
  '/artifacts/evidence/security-scan.png',
];

test('Navigation routes render (top nav)', async ({ page }) => {
  await page.goto('/');

  const nav = page.locator('nav');
  await expect(nav).toBeVisible();

  await nav.getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/start(\.html)?$/);

  await nav.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/\/about(\.html)?$/);

  await nav.getByRole('link', { name: 'Platform', exact: true }).click();
  await expect(page).toHaveURL(/\/platform(\.html)?$/);

  await nav.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(\.html)?$/);

  await nav.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/\/projects(\.html)?$/);

  await nav.getByRole('link', { name: 'Artifacts', exact: true }).click();
  await expect(page).toHaveURL(/\/artifacts(\.html)?$/);

  await nav.getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blog(\.html)?$/);

  await nav.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact(\.html)?$/);
});

test('Artifacts page: recruiter pack + library + evidence gallery + preview works', async ({ page }) => {
  await page.goto('/artifacts');
  await expect(page.getByRole('heading', { name: 'Runbooks & Evidence' })).toBeVisible();

  // Recruiter pack CTA
  await expect(page.getByRole('link', { name: /Recruiter Pack \(ZIP\)/i })).toHaveAttribute(
    'href',
    '/artifacts/recruiter-pack.zip'
  );

  await page.getByRole('link', { name: 'Browse Downloads' }).click();
  await expect(page.getByRole('heading', { name: 'Download Library' })).toBeVisible();

  const search = page.getByLabel(/Search artifacts/i);
  await search.fill('filled');
  await expect(page.getByText(/Test Strategy \(Filled Example\)/i)).toBeVisible();

  // Preview modal verifies “real content”, not placeholder
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await expect(page.getByRole('dialog', { name: /Preview/i })).toBeVisible();
  await expect(page.getByText(/Test Strategy \(Filled Example\)/i)).toBeVisible();

  // Evidence gallery exists
  await expect(page.getByRole('heading', { name: 'Evidence Gallery' })).toBeVisible();
});

test('Artifact/evidence files are served (200)', async ({ request }) => {
  for (const p of artifactPaths) {
    const res = await request.get(p);
    expect(res.status(), `Expected 200 for ${p}`).toBe(200);
  }
});

test('Project pages render and GitHub link exists', async ({ page }) => {
  for (const slug of projectSlugs) {
    await page.goto(`/projects/${slug}`);
    await expect(page.getByRole('link', { name: /View on GitHub/i })).toBeVisible();

    // New platform-signal block
    await expect(page.getByRole('heading', { name: 'Quality Gates', exact: true })).toBeVisible();
  }
});

test('Platform page renders architecture and pillars', async ({ page }) => {
  await page.goto('/platform');
  await expect(page.getByRole('heading', { name: /I build and operate automation systems in the cloud/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reference Architecture', exact: true })).toBeVisible();
});

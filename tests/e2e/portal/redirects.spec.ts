import { test, expect } from '../../fixtures/auth';

test.describe('Phase 2A redirects', () => {
  test('/portal/home redirects to /portal', async ({ clientPage }) => {
    await clientPage.goto('/portal/home', { waitUntil: 'domcontentloaded' });
    await expect(clientPage).toHaveURL(/\/portal(?:\/?$|\?)/);
  });

  test('/portal/admin redirects to /admin (admin user)', async ({ adminPage }) => {
    await adminPage.goto('/portal/admin', { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(/\/admin(?:\/?$|\?)/);
  });

  test('/portal/admin/clients redirects to /admin/crm (admin user)', async ({ adminPage }) => {
    await adminPage.goto('/portal/admin/clients', { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(/\/admin\/crm(?:\/?$|\?)/);
  });

  test('/portal/admin/activity redirects to /admin/audit-log (admin user)', async ({
    adminPage,
  }) => {
    await adminPage.goto('/portal/admin/activity', { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(/\/admin\/audit-log(?:\/?$|\?)/);
  });
});

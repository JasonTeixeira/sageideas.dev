import { test, expect } from '../../fixtures/auth';

const PORTAL_ROUTES = [
  '/portal',
  '/portal/projects',
  '/portal/messages',
  '/portal/inbox',
  '/portal/calendar',
  '/portal/documents',
  '/portal/invoices',
  '/portal/billing',
  '/portal/settings',
  '/portal/catalog',
  '/portal/help',
];

test.describe('NotificationBell on every portal route (Phase 2A.2)', () => {
  for (const route of PORTAL_ROUTES) {
    test(`bell present on ${route}`, async ({ clientPage }) => {
      await clientPage.goto(route, { waitUntil: 'domcontentloaded' });
      // Bell renders an aria-labeled button "Notifications".
      const bell = clientPage.getByRole('button', { name: /notifications/i }).first();
      await expect(bell).toBeVisible();
    });
  }
});

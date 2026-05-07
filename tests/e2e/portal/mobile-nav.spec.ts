import { test, expect } from '../../fixtures/auth';

test.describe('Portal mobile nav (Phase 2A.1)', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('hamburger visible at <lg viewport, sidebar hidden', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    const trigger = clientPage.getByTestId('portal-mobile-nav-trigger');
    await expect(trigger).toBeVisible();
    // Desktop sidebar uses `hidden lg:flex`, so it shouldn't be visible at 390px.
    const sidebar = clientPage.locator('aside').filter({ hasText: /Workspace/i }).first();
    await expect(sidebar).toBeHidden();
  });

  test('opens drawer, focuses first nav item, Esc closes', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    await clientPage.getByTestId('portal-mobile-nav-trigger').click();

    const dialog = clientPage.getByRole('dialog', { name: /portal navigation/i });
    await expect(dialog).toBeVisible();

    // First nav link should receive focus.
    const firstLink = dialog.getByRole('link', { name: /dashboard/i }).first();
    await expect(firstLink).toBeFocused({ timeout: 2000 });

    await clientPage.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('clicking a nav link closes the drawer and navigates', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    await clientPage.getByTestId('portal-mobile-nav-trigger').click();
    const dialog = clientPage.getByRole('dialog', { name: /portal navigation/i });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('link', { name: /messages/i }).first().click();
    await expect(clientPage).toHaveURL(/\/portal\/messages(\/|$|\?)/);
    await expect(dialog).toBeHidden();
  });

  test('backdrop click closes the drawer', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    await clientPage.getByTestId('portal-mobile-nav-trigger').click();
    const dialog = clientPage.getByRole('dialog', { name: /portal navigation/i });
    await expect(dialog).toBeVisible();
    await clientPage.getByTestId('portal-mobile-nav-backdrop').click();
    await expect(dialog).toBeHidden();
  });
});

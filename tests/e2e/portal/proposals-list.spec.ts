import { test, expect, ACME_SLUG, setActiveOrgCookie } from '../../fixtures/auth';

test.describe('/portal/proposals list', () => {
  test('client sees the proposals list scoped to their active org', async ({
    clientPage,
    context,
    baseURL,
  }) => {
    await setActiveOrgCookie(context, baseURL ?? 'http://localhost:3000', ACME_SLUG);

    await clientPage.goto('/portal/proposals');

    await expect(
      clientPage.getByRole('heading', { name: /^proposals$/i }),
    ).toBeVisible();

    const list = clientPage.getByTestId('portal-proposals-list');
    await expect(list).toBeVisible();

    // Either a row is present (seed data + non-draft proposal exists for Acme)
    // or the explicit empty state is shown. Both are valid passing states —
    // what matters is that the page renders cleanly under the auth fixture.
    const rows = clientPage.getByTestId('portal-proposal-row');
    const empty = clientPage.getByText(/no proposals yet/i);
    const rowCount = await rows.count();
    if (rowCount === 0) {
      await expect(empty).toBeVisible();
    } else {
      await expect(rows.first()).toBeVisible();
    }
  });
});

test.describe('legacy /sign/[token] removal', () => {
  test('public /sign/<token> returns 404 (route deleted in Phase 2F)', async ({
    request,
  }) => {
    const res = await request.get('/sign/test-bad-token', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });
});

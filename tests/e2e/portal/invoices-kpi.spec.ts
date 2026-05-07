import { test, expect } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';

const ORG_ACME = '1dd90daf-a55b-4ce4-9ef3-0c086604dc46';
const TOTAL = 1234.56;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe('Invoice KPI + breakdown (Phase 2A.3)', () => {
  let invoiceId: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const number = `PHASE2A-TEST-${Date.now()}`;
    const { data, error } = await sb
      .from('invoices')
      .insert({
        organization_id: ORG_ACME,
        number,
        status: 'open',
        subtotal: TOTAL,
        tax: 0,
        total: TOTAL,
        amount_due: TOTAL,
        amount_paid: 0,
      })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('insert failed');
    invoiceId = data.id;
  });

  test.afterAll(async () => {
    if (!invoiceId) return;
    const sb = adminClient();
    await sb.from('invoices').delete().eq('id', invoiceId);
  });

  test('dashboard KPI sums amount_due correctly', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    // KPI sub-text contains the formatted currency.
    await expect(clientPage.getByText(/\$1,234\.56/)).toBeVisible();
  });

  test('invoices list row shows total', async ({ clientPage }) => {
    await clientPage.goto('/portal/invoices');
    await expect(clientPage.getByText(/\$1,234\.56/).first()).toBeVisible();
  });

  test('invoice detail shows full breakdown including amount due', async ({ clientPage }) => {
    if (!invoiceId) test.skip(true, 'invoice not seeded');
    await clientPage.goto(`/portal/invoices/${invoiceId}`);
    await expect(clientPage.getByText(/Subtotal/i)).toBeVisible();
    await expect(clientPage.getByText(/^Total$/i).first()).toBeVisible();
    await expect(clientPage.getByText(/Amount due/i)).toBeVisible();
    await expect(clientPage.getByTestId('invoice-amount-due')).toContainText('$1,234.56');
  });
});

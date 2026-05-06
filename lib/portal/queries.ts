import { supabaseAdmin } from '@/lib/supabase/server';

export async function getEngagementsForOrg(organizationId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('engagements')
    .select('*, phases(*), deliverables(id, status, title)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getEngagement(id: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('engagements')
    .select(
      '*, organizations(*), phases(*), deliverables(*, iterations(*))',
    )
    .eq('id', id)
    .single();
  return data;
}

export async function getDocumentsForOrg(organizationId: string) {
  const sb = supabaseAdmin();
  // Clients see shared files plus contracts in flight or executed.
  // Drafts and soft-deleted records are hidden.
  const { data } = await sb
    .from('documents')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['shared', 'sent', 'signed', 'countersigned'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getInvoicesForOrg(organizationId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('invoices')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getThreadsForOrg(organizationId: string) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('threads')
    .select('*, messages(id, body, created_at)')
    .eq('organization_id', organizationId)
    .order('last_message_at', { ascending: false });
  return data ?? [];
}

export async function getServiceCatalog() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('service_catalog')
    .select('*')
    .eq('active', true)
    .order('price', { ascending: true });
  return data ?? [];
}

export async function getRecentActivity(organizationId: string, limit = 20) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('activity')
    .select('*, app_users:actor_id(full_name, avatar_url)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Admin queries
export async function getAllEngagements() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('engagements')
    .select('*, organizations(name, slug, logo_url)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAllOrgs() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('organizations')
    .select('*, engagements(id, status, contract_value)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

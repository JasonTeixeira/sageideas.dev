import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { ProposalEditor, type OrgOption, type TemplateOption } from '@/components/admin/proposal-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New proposal' };

export default async function NewProposalPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const [{ data: orgs }, { data: templates }] = await Promise.all([
    sb.from('organizations').select('id, name').order('name', { ascending: true }),
    sb
      .from('project_templates')
      .select('id, name, service_type')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  const orgOptions: OrgOption[] = (orgs ?? []).map((o) => ({
    id: o.id as string,
    name: (o.name as string | null) ?? 'Untitled org',
  }));
  const templateOptions: TemplateOption[] = (templates ?? []).map((t) => ({
    id: t.id as string,
    name: (t.name as string | null) ?? 'Untitled template',
    service_type: (t.service_type as string | null) ?? null,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: 'Proposals', href: '/admin/proposals' },
          { label: 'New' },
        ]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa] mb-1">
          New proposal
        </h1>
        <p className="text-sm text-[#a1a1aa] mb-6">
          Build a priced offer; send it as an acceptance-link to your prospect.
        </p>
        <ProposalEditor mode="create" orgs={orgOptions} templates={templateOptions} />
      </div>
    </>
  );
}

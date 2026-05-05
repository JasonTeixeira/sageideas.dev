import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { TemplateEditor } from '@/components/admin/template-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit template' };

interface TemplateRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  body_md: string | null;
  variables: unknown;
  active: boolean | null;
  version: number | null;
  updated_at: string;
}

interface OrgRow {
  id: string;
  name: string;
}

interface EngagementRow {
  id: string;
  title: string | null;
  organization_id: string;
}

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('contract_templates')
    .select('id, slug, title, category, body_md, variables, active, version, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const template = data as TemplateRow;

  const { data: orgs } = await sb
    .from('organizations')
    .select('id, name')
    .order('name');
  const { data: engagements } = await sb
    .from('engagements')
    .select('id, title, organization_id')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: 'Templates', href: '/admin/templates' },
          { label: template.title },
        ]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <TemplateEditor
          template={{
            id: template.id,
            slug: template.slug,
            title: template.title,
            category: template.category ?? 'other',
            body_md: template.body_md ?? '',
            variables: Array.isArray(template.variables) ? template.variables : [],
            active: template.active ?? true,
            version: template.version ?? 1,
            updated_at: template.updated_at,
          }}
          organizations={(orgs ?? []) as OrgRow[]}
          engagements={(engagements ?? []) as EngagementRow[]}
        />
      </div>
    </>
  );
}

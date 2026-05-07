import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import {
  ProjectTemplatesList,
  type OrgOption,
  type ProjectTemplateRow,
} from '@/components/admin/project-templates-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Project templates' };

export default async function AdminProjectTemplatesPage() {
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const [{ data: templates }, { data: orgs }] = await Promise.all([
    sb
      .from('project_templates')
      .select(
        'id, name, service_type, description, default_milestones, default_tasks, default_target_days, is_active, updated_at',
      )
      .order('name', { ascending: true }),
    sb.from('organizations').select('id, name').order('name', { ascending: true }),
  ]);

  const rows = (templates ?? []) as unknown as ProjectTemplateRow[];
  const orgOptions: OrgOption[] = (orgs ?? []).map((o) => ({
    id: o.id as string,
    name: (o.name as string | null) ?? 'Untitled org',
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Project templates' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Project templates
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Pre-built engagement scaffolding. Click{' '}
            <span className="font-medium text-[#fafafa]">New from template</span> to
            instantiate one against an org — milestones + tasks land seeded.
          </p>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-[#71717a]">
              No project templates yet. Seeded data should ship two of them.
            </CardContent>
          </Card>
        ) : (
          <ProjectTemplatesList templates={rows} orgs={orgOptions} />
        )}

        <div className="mt-6 flex flex-wrap gap-2 text-xs text-[#71717a]">
          <Badge tone="neutral">read-mostly</Badge>
          <span>
            Editing schemas ships in PR-B. For now, instantiation is the primary action.
          </span>
        </div>
      </div>
    </>
  );
}

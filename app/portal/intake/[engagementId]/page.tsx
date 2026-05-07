import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { IntakeForm } from '@/components/portal/intake-form';
import {
  loadFormDefinitionForEngagement,
  parseIntakeSchema,
  readAnswers,
} from '@/lib/portal/intake';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kickoff intake' };

type EngagementRow = {
  id: string;
  organization_id: string | null;
  title: string;
  service_type: string | null;
  intake: unknown;
  intake_form_id: string | null;
  intake_submitted_at: string | null;
};

export default async function IntakePage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('engagements')
    .select(
      'id, organization_id, title, service_type, intake, intake_form_id, intake_submitted_at',
    )
    .eq('id', engagementId)
    .maybeSingle();
  const eng = data as EngagementRow | null;
  if (!eng) notFound();
  if (!ctx.isAdmin && eng.organization_id !== ctx.organizationId) notFound();

  const definition = await loadFormDefinitionForEngagement({
    engagement: {
      id: eng.id,
      intake_form_id: eng.intake_form_id,
      service_type: eng.service_type,
    },
    sb,
  });

  const crumbs = [
    { label: 'Dashboard', href: '/portal' },
    { label: 'Projects', href: '/portal/projects' },
    { label: eng.title, href: `/portal/projects/${eng.id}` },
    { label: 'Kickoff intake' },
  ];

  if (!definition) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div
          className="px-6 lg:px-8 py-12 max-w-2xl mx-auto"
          data-testid="intake-page"
        >
          <Card>
            <CardContent className="p-10 text-center text-sm text-[#a1a1aa]">
              No intake form configured for this engagement yet. Sage will reach
              out shortly with kickoff questions.
              <div className="mt-6">
                <Link href={`/portal/projects/${eng.id}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to project
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const submitted = !!eng.intake_submitted_at;
  const answers = readAnswers(eng.intake);

  if (submitted) {
    const schema = definition.schema;
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div
          className="px-6 lg:px-8 py-10 max-w-3xl mx-auto"
          data-testid="intake-page"
        >
          <Card>
            <CardContent className="p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-[#fafafa]">
                    Kickoff intake submitted
                  </h1>
                  <p className="text-xs text-[#a1a1aa]">
                    Submitted {formatDate(eng.intake_submitted_at)}
                  </p>
                </div>
              </div>
              <div
                className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]"
                data-testid="kickoff-answers"
              >
                {schema.fields.map((f) => (
                  <div key={f.id} className="px-4 py-3">
                    <div className="text-[10px] uppercase tracking-wider text-[#52525b]">
                      {f.label}
                    </div>
                    <div className="mt-1 text-sm text-[#fafafa] whitespace-pre-wrap">
                      {answers[f.id] || '—'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Link href={`/portal/projects/${eng.id}`}>
                  <Button size="sm" variant="outline">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to project
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={crumbs} />
      <div
        className="px-6 lg:px-8 py-10 max-w-3xl mx-auto"
        data-testid="intake-page"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            {definition.title}
          </h1>
          {definition.description ? (
            <p className="text-sm text-[#a1a1aa] mt-1">{definition.description}</p>
          ) : null}
          <p className="text-xs text-[#71717a] mt-1">
            Project: <span className="text-[#a1a1aa]">{eng.title}</span>
          </p>
        </header>

        <Card>
          <CardContent className="p-6">
            <IntakeForm
              engagementId={eng.id}
              formId={definition.id}
              schema={parseIntakeSchema(definition.schema)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

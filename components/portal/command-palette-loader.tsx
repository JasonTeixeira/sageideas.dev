import {
  getEngagementsForOrg,
  getInvoicesForOrg,
  getThreadsForOrg,
} from '@/lib/portal/queries';
import {
  CommandPalette,
  type CommandIndex,
} from './command-palette';

/**
 * Server component that fetches a lightweight index for the active org and
 * renders the client palette with it. Mounted once by the portal layout so the
 * palette is available on every portal route.
 */
export async function CommandPaletteLoader({
  organizationId,
}: {
  organizationId: string | null;
}) {
  const empty: CommandIndex = { projects: [], invoices: [], threads: [] };

  const index: CommandIndex = !organizationId
    ? empty
    : await buildIndex(organizationId);

  return <CommandPalette index={index} />;
}

async function buildIndex(organizationId: string): Promise<CommandIndex> {
  const [engagements, invoices, threads] = await Promise.all([
    getEngagementsForOrg(organizationId),
    getInvoicesForOrg(organizationId),
    getThreadsForOrg(organizationId),
  ]);

  type EngagementRow = { id: string; title: string | null; status: string | null };
  type InvoiceRow = { id: string; number: string | null; status: string | null };
  type ThreadRow = {
    id: string;
    engagement_id: string | null;
    subject: string | null;
  };

  return {
    projects: (engagements as EngagementRow[]).map((e) => ({
      id: e.id,
      title: e.title ?? 'Untitled project',
      status: e.status ?? null,
    })),
    invoices: (invoices as InvoiceRow[]).map((iv) => ({
      id: iv.id,
      number: iv.number ?? null,
      status: iv.status ?? null,
    })),
    threads: (threads as ThreadRow[]).map((t) => ({
      id: t.id,
      engagementId: t.engagement_id ?? null,
      subject: t.subject ?? 'Untitled thread',
    })),
  };
}

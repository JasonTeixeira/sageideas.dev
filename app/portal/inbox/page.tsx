import { getPortalContext } from '@/lib/portal/auth';
import { Topbar } from '@/components/portal/topbar';
import { InboxList } from '@/components/portal/inbox-list';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Inbox' };

export default async function InboxPage() {
  await getPortalContext();
  return (
    <>
      <Topbar
        crumbs={[{ label: 'Workspace', href: '/portal' }, { label: 'Inbox' }]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Inbox</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Every notification - read, unread, all kinds. The bell shows the highlights, this is the receipt.
          </p>
        </div>
        <InboxList />
      </div>
    </>
  );
}

import { redirect } from 'next/navigation';
import { getUserWithProfile } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/sidebar';
import { TimeTracker } from '@/components/admin/time-tracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: { default: 'Admin · Sage Ideas', template: '%s · Sage Admin' },
  description: 'Studio admin cockpit.',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await getUserWithProfile();
  if (!result) redirect('/login?next=%2Fadmin');
  if (result.profile.app_role !== 'admin') redirect('/portal');

  return (
    <div className="flex min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
      <TimeTracker />
    </div>
  );
}

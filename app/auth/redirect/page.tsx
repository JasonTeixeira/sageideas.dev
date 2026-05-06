import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Signing you in · Sage Ideas',
  robots: { index: false, follow: false },
};

export default async function AuthRedirectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role, approval_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.app_role === 'admin') redirect('/admin');
  if (profile?.approval_status === 'approved') redirect('/portal');
  redirect('/pending-approval');
}

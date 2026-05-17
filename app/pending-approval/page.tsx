import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pending approval · Sage Ideas',
  robots: { index: false, follow: false },
};

export default async function PendingApprovalPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role, approval_status, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.app_role === 'admin') redirect('/admin');
  if (profile?.approval_status === 'approved') redirect('/portal/home');

  const email = profile?.email ?? user.email ?? '';

  return (
    <div className="min-h-screen flex bg-[#09090B]">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 text-[#FAFAFA] mb-8">
            <SageLogo />
            <span className="font-semibold">Sage Ideas Studio</span>
          </div>

          <div className="text-[10px] font-mono uppercase tracking-widest text-[#F59E0B] mb-3">
            Awaiting approval
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA] mb-4">
            You’re in the queue.
          </h2>
          <p className="text-sm text-[#A8A29E] leading-relaxed">
            Your account is signed in but hasn’t been approved yet. We review every request
            manually within 24 hours and will email{' '}
            <span className="font-medium text-[#FAFAFA]">{email}</span> as soon as the workspace is
            ready for you.
          </p>

          <div className="mt-6 rounded-xl border border-[#2A2826] bg-[#12110F] p-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              Need it sooner?
            </div>
            <p className="text-sm text-[#A8A29E]">
              Email{' '}
              <a
                href="mailto:sage@sageideas.dev"
                className="text-[#0ED3CF] hover:text-[#22D3EE]"
              >
                sage@sageideas.dev
              </a>{' '}
              with your engagement context and we’ll fast-track it.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="text-xs font-mono uppercase tracking-widest text-[#78716C] hover:text-[#FAFAFA]"
            >
              ← Back to home
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-[#2A2826] px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

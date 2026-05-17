import Link from 'next/link';
import { GradientMesh } from '@/components/auth/gradient-mesh';
import { SageLogo } from '@/components/auth/brand-panel';

export const metadata = {
  title: 'Unsubscribed · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const sp = await searchParams;
  const email = sp.email ?? '';

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090B] p-6">
      <GradientMesh />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2A2826] bg-[#12110F] p-8 space-y-5">
        <div className="flex items-center gap-3 text-[#FAFAFA]">
          <SageLogo />
          <span className="font-semibold">Sage Ideas</span>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
            Unsubscribed
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
            You’re off the list.
          </h1>
          <p className="text-sm text-[#A8A29E] leading-relaxed">
            {email ? (
              <>
                We won’t send marketing email to{' '}
                <span className="font-medium text-[#FAFAFA]">{email}</span> anymore. Transactional
                messages tied to an active engagement (invoices, contracts, deliverables) still go
                through — those aren’t optional.
              </>
            ) : (
              <>
                We won’t send you marketing email anymore. Transactional messages tied to an
                active engagement still go through.
              </>
            )}
          </p>
          <p className="text-xs text-[#78716C]">
            Did this in error? Reply to any prior email from us and we’ll re-add you.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center text-xs font-mono uppercase tracking-widest text-[#0ED3CF] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 rounded-sm"
        >
          ← Back to sageideas.dev
        </Link>
      </div>
    </div>
  );
}

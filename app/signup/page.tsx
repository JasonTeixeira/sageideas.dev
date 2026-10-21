import { BrandPanel, SageLogo } from '@/components/auth/brand-panel'
import { GradientMesh } from '@/components/auth/gradient-mesh'
import { StudioSignupWizard } from '@/components/auth/studio-signup-wizard'

export const metadata = {
  title: 'Request access · Sage Ideas',
  description: 'Request access to the Sage Ideas client workspace and project portal.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ email?: string; error?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const sp = await searchParams
  const email = typeof sp.email === 'string' ? sp.email.slice(0, 320) : ''
  const error = typeof sp.error === 'string' ? sp.error.slice(0, 300) : undefined

  return (
    <main className="relative min-h-screen flex bg-[#09090B]">
      <GradientMesh />
      <div className="relative z-10 flex flex-1">
        <BrandPanel />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 text-[#FAFAFA] mb-8">
              <SageLogo />
              <span className="font-semibold">Sage Ideas Studio</span>
            </div>
            <StudioSignupWizard initialEmail={email} error={error} />
          </div>
        </div>
      </div>
    </main>
  )
}

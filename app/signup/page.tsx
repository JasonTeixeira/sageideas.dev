import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUpWithPassword } from '@/app/auth/actions';
import { BrandPanel, SageLogo } from '@/components/auth/brand-panel';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { GradientMesh } from '@/components/auth/gradient-mesh';

export const metadata = {
  title: 'Request access · Sage Ideas',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    step?: string;
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    company?: string;
    error?: string;
  }>;
};

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client (hiring or commissioning work)' },
  { value: 'vendor', label: 'Vendor / contractor' },
  { value: 'other', label: 'Other' },
];

const GOAL_OPTIONS = [
  { value: 'hire', label: 'Hire for a project' },
  { value: 'quote', label: 'Get a quote' },
  { value: 'explore', label: 'Just exploring' },
];

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Account', 'About you', 'Goals'];
  return (
    <ol className="flex items-center gap-2 mb-8" aria-label="Signup progress">
      {steps.map((label, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const active = idx === step;
        const done = idx < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono border ${
                done
                  ? 'bg-[#0ED3CF] border-[#0ED3CF] text-[#09090B]'
                  : active
                    ? 'border-[#0ED3CF] text-[#0ED3CF]'
                    : 'border-[#2A2826] text-[#52525B]'
              }`}
            >
              {idx}
            </span>
            <span
              className={`text-[11px] font-mono uppercase tracking-widest ${
                active ? 'text-[#FAFAFA]' : 'text-[#52525B]'
              }`}
            >
              {label}
            </span>
            {idx < 3 && <span className="w-6 h-px bg-[#2A2826]" />}
          </li>
        );
      })}
    </ol>
  );
}

export default async function SignupPage({ searchParams }: Props) {
  const sp = await searchParams;
  const stepParam = Number(sp.step ?? '1');
  const step = (stepParam === 2 || stepParam === 3 ? stepParam : 1) as 1 | 2 | 3;
  const email = sp.email ?? '';
  const password = sp.password ?? '';
  const fullName = sp.full_name ?? '';
  const role = sp.role ?? '';
  const company = sp.company ?? '';
  const error = sp.error;

  if (step >= 2 && !email) redirect('/signup');
  if (step === 3 && !fullName) {
    redirect(
      `/signup?step=2&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    );
  }

  return (
    <div className="relative min-h-screen flex bg-[#09090B]">
      <GradientMesh />
      <div className="relative z-10 flex flex-1">
        <BrandPanel />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 text-[#FAFAFA] mb-8">
              <SageLogo />
              <span className="font-semibold">Sage Ideas Studio</span>
            </div>

            <Stepper step={step} />

            <div aria-live="polite" aria-atomic="true">
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-[#7F1D1D]/50 bg-[#7F1D1D]/10 px-3 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {decodeURIComponent(error)}
                </div>
              )}
            </div>

            {step === 1 && <StepAccount email={email} />}
            {step === 2 && (
              <StepIntake
                email={email}
                password={password}
                fullName={fullName}
                role={role}
                company={company}
              />
            )}
            {step === 3 && (
              <StepGoals
                email={email}
                password={password}
                fullName={fullName}
                role={role}
                company={company}
              />
            )}

            <p className="mt-8 text-xs text-[#78716C] text-center">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#0ED3CF] hover:text-[#22D3EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 rounded-sm"
              >
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepAccount({ email }: { email: string }) {
  return (
    <>
      <div className="space-y-2 mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
          Studio access. Built for clients and craft.
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
          Create your account
        </h2>
        <p className="text-sm text-[#A8A29E]">
          New accounts are reviewed manually within 24 hours.
        </p>
      </div>

      <form action="/signup" method="GET" className="space-y-4">
        <input type="hidden" name="step" value="2" />

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={email}
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C]"
          >
            Password (min 8 chars)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[#0ED3CF] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0AA8A5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
        >
          Continue
        </button>
      </form>

      <div className="my-6 flex items-center gap-3" role="separator" aria-hidden>
        <div className="flex-1 h-px bg-[#2A2826]" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525B]">
          or continue with
        </span>
        <div className="flex-1 h-px bg-[#2A2826]" />
      </div>

      <OAuthButtons next="/onboarding" />
    </>
  );
}

function StepIntake({
  email,
  password,
  fullName,
  role,
  company,
}: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  company: string;
}) {
  return (
    <>
      <div className="space-y-1.5 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
          Tell us about you
        </h2>
        <p className="text-sm text-[#A8A29E]">
          Two minutes — promise. We use this to triage faster.
        </p>
      </div>

      <form action="/signup" method="GET" className="space-y-4">
        <input type="hidden" name="step" value="3" />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C]"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            defaultValue={fullName}
            placeholder="Jane Operator"
            className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
          />
        </div>

        <fieldset className="space-y-1.5">
          <legend className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C] mb-1.5">
            Your role
          </legend>
          <div className="space-y-2">
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] hover:border-[#0ED3CF]/40 cursor-pointer has-[:checked]:border-[#0ED3CF] has-[:checked]:bg-[#0ED3CF]/5"
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  required
                  defaultChecked={role === opt.value}
                  className="accent-[#0ED3CF] h-4 w-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label
            htmlFor="company"
            className="block text-[10px] font-mono uppercase tracking-widest text-[#78716C]"
          >
            Company (optional)
          </label>
          <input
            id="company"
            name="company"
            type="text"
            defaultValue={company}
            placeholder="Acme Inc."
            className="w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#0ED3CF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/40"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            href={`/signup?step=1&email=${encodeURIComponent(email)}`}
            className="flex-1 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-center text-sm font-medium text-[#FAFAFA] hover:border-[#3F3F46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
          >
            Back
          </Link>
          <button
            type="submit"
            className="flex-[2] rounded-lg bg-[#0ED3CF] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0AA8A5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </>
  );
}

function StepGoals({
  email,
  password,
  fullName,
  role,
  company,
}: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  company: string;
}) {
  return (
    <>
      <div className="space-y-1.5 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
          What brings you here?
        </h2>
        <p className="text-sm text-[#A8A29E]">Pick everything that fits — we’ll route accordingly.</p>
      </div>

      <form action={signUpWithPassword} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="full_name" value={fullName} />
        <input type="hidden" name="role_in_company" value={role} />
        <input type="hidden" name="company" value={company} />
        <input type="hidden" name="password" value={password} />

        <fieldset className="space-y-2">
          <legend className="sr-only">Goals</legend>
          {GOAL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-3 text-sm text-[#FAFAFA] hover:border-[#0ED3CF]/40 cursor-pointer has-[:checked]:border-[#0ED3CF] has-[:checked]:bg-[#0ED3CF]/5"
            >
              <input
                type="checkbox"
                name="goals"
                value={opt.value}
                className="accent-[#0ED3CF] h-4 w-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="flex gap-2 pt-2">
          <Link
            href={`/signup?step=2&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&full_name=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}&company=${encodeURIComponent(company)}`}
            className="flex-1 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-center text-sm font-medium text-[#FAFAFA] hover:border-[#3F3F46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60"
          >
            Back
          </Link>
          <button
            type="submit"
            className="flex-[2] rounded-lg bg-[#0ED3CF] px-4 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-[#0AA8A5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors"
          >
            Create account
          </button>
        </div>

        <p className="text-xs text-[#78716C] leading-relaxed pt-1">
          We’ll email <span className="text-[#FAFAFA] font-medium">{email}</span> to verify, then queue your access for review.
        </p>
      </form>
    </>
  );
}

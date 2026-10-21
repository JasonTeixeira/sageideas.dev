'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { signUpWithPassword } from '@/app/auth/actions'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client (hiring or commissioning work)' },
  { value: 'vendor', label: 'Vendor / contractor' },
  { value: 'other', label: 'Other' },
] as const

const GOAL_OPTIONS = [
  { value: 'hire', label: 'Hire for a project' },
  { value: 'quote', label: 'Get a quote' },
  { value: 'explore', label: 'Just exploring' },
] as const

type Step = 1 | 2 | 3

function Stepper({ step }: { step: Step }) {
  const steps = ['Account', 'About you', 'Goals']
  return (
    <ol className="flex items-center gap-2 mb-8" aria-label="Signup progress">
      {steps.map((label, index) => {
        const itemStep = (index + 1) as Step
        const active = itemStep === step
        const done = itemStep < step
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono border ${
                done
                  ? 'bg-[#3D5AFE] border-[#3D5AFE] text-white'
                  : active
                    ? 'border-[#3D5AFE] text-[#3D5AFE]'
                    : 'border-[#2A2826] text-[#52525B]'
              }`}
            >
              {itemStep}
            </span>
            <span className={`text-[11px] font-mono uppercase tracking-widest ${active ? 'text-[#FAFAFA]' : 'text-[#52525B]'}`}>
              {label}
            </span>
            {itemStep < 3 && <span className="w-6 h-px bg-[#2A2826]" />}
          </li>
        )
      })}
    </ol>
  )
}

const inputClass = 'w-full rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-[#3D5AFE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE]/40'
const labelClass = 'block text-[10px] font-mono uppercase tracking-widest text-[#78716C]'
const backClass = 'flex-1 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-4 py-2.5 text-center text-sm font-medium text-[#FAFAFA] hover:border-[#3F3F46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE]/60'
const continueClass = 'flex-[2] rounded-lg bg-[#3D5AFE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F46D8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] transition-colors'

export function StudioSignupWizard({
  initialEmail = '',
  error,
}: {
  initialEmail?: string
  error?: string
}) {
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState(initialEmail)
  const [fullName, setFullName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const advance = (from: Step, to: Step) => {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${from}"] input`)
    if (fields && !Array.from(fields).every((field) => field.reportValidity())) return
    setStep(to)
  }

  return (
    <>
      <Stepper step={step} />
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-[#7F1D1D]/50 bg-[#7F1D1D]/10 px-3 py-2.5 text-sm text-[#FCA5A5]">
            {error}
          </div>
        )}
      </div>

      <form ref={formRef} action={signUpWithPassword} className="space-y-4">
        <section data-step="1" hidden={step !== 1} aria-labelledby="signup-account-heading" className="space-y-4">
          <div className="space-y-2 mb-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#3D5AFE]">
              Studio access. Built for clients and craft.
            </div>
            <h1 id="signup-account-heading" className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">
              Create your account
            </h1>
            <p className="text-sm text-[#A8A29E]">New accounts are reviewed manually within 24 hours.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className={labelClass}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className={labelClass}>Password (8–128 chars)</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <button type="button" onClick={() => advance(1, 2)} className="w-full rounded-lg bg-[#3D5AFE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F46D8] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]">
            Continue
          </button>
        </section>

        <section data-step="2" hidden={step !== 2} aria-labelledby="signup-about-heading" className="space-y-4">
          <div className="space-y-1.5 mb-6">
            <h1 id="signup-about-heading" className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Tell us about you</h1>
            <p className="text-sm text-[#A8A29E]">Two minutes — promise. We use this to triage faster.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="full_name" className={labelClass}>Full name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              maxLength={200}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              placeholder="Jane Operator"
              className={inputClass}
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className={`${labelClass} mb-1.5`}>Your role</legend>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-3 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-2.5 text-sm text-[#FAFAFA] hover:border-[#3D5AFE]/40 cursor-pointer has-[:checked]:border-[#3D5AFE] has-[:checked]:bg-[#3D5AFE]/5">
                  <input type="radio" name="role_in_company" value={option.value} required className="accent-[#3D5AFE] h-4 w-4" />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor="company" className={labelClass}>Company (optional)</label>
            <input id="company" name="company" type="text" maxLength={200} autoComplete="organization" placeholder="Acme Inc." className={inputClass} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className={backClass}>Back</button>
            <button type="button" onClick={() => advance(2, 3)} className={continueClass}>Continue</button>
          </div>
        </section>

        <section data-step="3" hidden={step !== 3} aria-labelledby="signup-goals-heading" className="space-y-4">
          <div className="space-y-1.5 mb-6">
            <h1 id="signup-goals-heading" className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">What brings you here?</h1>
            <p className="text-sm text-[#A8A29E]">Pick everything that fits — we’ll route accordingly.</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="sr-only">Goals</legend>
            {GOAL_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 rounded-lg border border-[#2A2826] bg-[#0B0A09] px-3 py-3 text-sm text-[#FAFAFA] hover:border-[#3D5AFE]/40 cursor-pointer has-[:checked]:border-[#3D5AFE] has-[:checked]:bg-[#3D5AFE]/5">
                <input type="checkbox" name="goals" value={option.value} className="accent-[#3D5AFE] h-4 w-4" />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(2)} className={backClass}>Back</button>
            <button type="submit" className={continueClass}>Create account</button>
          </div>
          <p className="text-xs text-[#78716C] leading-relaxed pt-1">
            We’ll email <span className="text-[#FAFAFA] font-medium">{email}</span> to verify, then queue your access for review.
          </p>
        </section>
      </form>

      {step === 1 && (
        <div>
          <div className="my-6 flex items-center gap-3" role="separator" aria-hidden="true">
            <div className="flex-1 h-px bg-[#2A2826]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#52525B]">or continue with</span>
            <div className="flex-1 h-px bg-[#2A2826]" />
          </div>
          <OAuthButtons next="/onboarding" />
        </div>
      )}

      <p className="mt-8 text-xs text-[#78716C] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#3D5AFE] hover:text-[#5670ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D5AFE]/60 rounded-sm">
          Sign in →
        </Link>
      </p>
    </>
  )
}

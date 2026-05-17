export function SageLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-label="Sage Ideas">
      <rect x="2" y="2" width="60" height="60" rx="14" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 22 L32 22 M20 32 L44 32 M20 42 L36 42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="22" r="3" fill="currentColor" />
    </svg>
  );
}

export function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-1 relative bg-[#12110F] border-r border-[#2A2826] overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 20% 20%, rgba(6,182,212,0.12), transparent 60%), radial-gradient(50% 60% at 80% 70%, rgba(139,92,246,0.10), transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <div className="flex items-center gap-3 text-[#FAFAFA]">
          <SageLogo />
          <div>
            <div className="font-semibold text-base tracking-tight">Sage Ideas</div>
            <div className="text-xs text-[#78716C] uppercase tracking-wider font-mono">
              The Studio · Client Workspace
            </div>
          </div>
        </div>

        <div className="space-y-8 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#FAFAFA]">
            Your private workspace for every engagement.
          </h1>
          <p className="text-[#A8A29E] leading-relaxed">
            Real-time deliverables, signed contracts, threaded conversations, and a direct line to
            the team — all in one place.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              ['Live pipeline', 'See every phase, deliverable, and iteration in real time.'],
              ['Inline e-sign', 'Contracts signed in-app with full audit trail.'],
              ['Direct messaging', 'No email threads. No Slack channels. Just clarity.'],
              ['Stripe billing', 'Invoices, subscriptions, and add-ons in one place.'],
            ].map(([title, desc]) => (
              <div key={title} className="space-y-1">
                <div className="text-sm font-medium text-[#FAFAFA]">{title}</div>
                <div className="text-xs text-[#78716C] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#57534E]">
          © {new Date().getFullYear()} Sage Ideas Studio · sageideas.dev
        </div>
      </div>
    </div>
  );
}

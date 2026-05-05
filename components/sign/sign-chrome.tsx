import { ReactNode } from 'react';

export function SignChrome({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e4e7]">
      <div className="border-b border-[#18181b] bg-[#0a0a0c]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#06b6d4] to-[#0891b2] flex items-center justify-center text-[10px] font-bold text-[#0a0a0c]">
              S
            </div>
            <span className="text-sm font-semibold text-[#fafafa]">
              Sage Ideas Studio
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-mono text-[#71717a]">
            Secure document signing
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

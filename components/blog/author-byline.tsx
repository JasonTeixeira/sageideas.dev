import Image from 'next/image'
import Link from 'next/link'

export function AuthorByline() {
  return (
    <div className="mt-12 rounded-2xl border border-[#2A2826] bg-[#12110F] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <Image
        src="/images/headshot.jpg"
        alt="Jason Teixeira"
        width={72}
        height={72}
        className="rounded-full border border-[#3D3A37] shrink-0"
      />
      <div className="flex-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-1.5">
          Written by
        </div>
        <div className="text-lg font-semibold text-[#FAFAFA]">Jason Teixeira</div>
        <div className="text-sm text-[#A8A29E] mt-0.5">
          Founder, Sage Ideas Studio
        </div>
        <Link
          href="/founder"
          className="text-sm text-[#0ED3CF] hover:text-[#22D3EE] mt-3 inline-flex items-center gap-1 transition-colors"
        >
          More about Jason →
        </Link>
      </div>
    </div>
  )
}

import Image from 'next/image'

/**
 * Subtle hero background image for key pages.
 * Renders at low opacity behind content for depth without distraction.
 */
export function PageHeroBg({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.07]"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090B]/50 to-[#09090B]" />
    </div>
  )
}

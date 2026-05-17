"use client"

import { motion } from "framer-motion"

interface PricingHeroProps {
  heroImageSrc?: string
}

export function PricingHero({ heroImageSrc }: PricingHeroProps) {
  return (
    <section className="relative overflow-hidden pb-24 pt-32">
      {/* Hero background image at 7% opacity */}
      {heroImageSrc && (
        <div className="absolute inset-0 z-0">
          <img
            src={heroImageSrc}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={{ opacity: 0.07 }}
          />
          {/* Gradient fade overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, #09090B 85%)",
            }}
          />
        </div>
      )}

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(14,211,207,0.07) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-mono tracking-widest uppercase"
          style={{
            borderColor: "rgba(14,211,207,0.3)",
            color: "#0ED3CF",
            background: "rgba(14,211,207,0.06)",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "#0ED3CF" }}
          />
          Sage Ideas Studio · Pricing
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F4F2EF",
          }}
        >
          Transparent pricing.
          <br />
          <span style={{ color: "#0ED3CF" }}>Fixed scope.</span>
          <br />
          No surprises.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed"
          style={{ color: "#A8A29E" }}
        >
          Three distinct engagement lanes designed for where you actually are.
          Start with a focused{" "}
          <span style={{ color: "#F4F2EF" }}>Audit</span> to surface what&apos;s
          broken, move into a scoped{" "}
          <span style={{ color: "#F4F2EF" }}>Build</span> to ship what matters,
          or partner deeply through a full{" "}
          <span style={{ color: "#F4F2EF" }}>Studio Engagement</span>.
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-4"
        >
          {[
            { value: "47+", label: "Projects shipped" },
            { value: "100%", label: "Fixed-scope delivery" },
            { value: "< 48h", label: "First deliverable" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="font-mono text-2xl font-bold"
                style={{ color: "#F4F2EF" }}
              >
                {stat.value}
              </div>
              <div className="mt-0.5 text-sm" style={{ color: "#A8A29E" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

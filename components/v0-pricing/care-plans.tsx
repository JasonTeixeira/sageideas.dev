"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const plans = [
  {
    name: "Site Care",
    price: "$300",
    cycle: "/mo",
    color: "#0ED3CF",
    description:
      "Uptime monitoring, dependency updates, performance checks, and monthly health report.",
    features: [
      "Uptime & performance monitoring",
      "Monthly dependency updates",
      "Bug fix credits (2h/mo)",
      "Monthly health report",
    ],
  },
  {
    name: "Brand Care",
    price: "$500",
    cycle: "/mo",
    color: "#A8C633",
    description:
      "Everything in Site Care plus design system maintenance, asset refreshes, and brand consistency audits.",
    features: [
      "Everything in Site Care",
      "Design system updates",
      "Asset & copy refreshes",
      "Brand consistency review",
      "4h design credit/mo",
    ],
  },
  {
    name: "Content Care",
    price: "$800",
    cycle: "/mo",
    color: "#E85D3A",
    description:
      "Full content operations: CMS management, SEO tracking, content calendar, and monthly analytics.",
    features: [
      "Everything in Brand Care",
      "CMS content management",
      "SEO monitoring & reporting",
      "Content calendar planning",
      "Monthly analytics digest",
      "6h content credit/mo",
    ],
  },
]

function SmallCheck({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="7" fill={color} fillOpacity="0.12" />
      <path
        d="M4.5 7l2 2 3.5-3.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CarePlans() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      {/* Divider */}
      <div
        className="mb-16 h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, #2A2826, transparent)",
        }}
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        className="mb-12 text-center"
      >
        <p
          className="mb-3 font-mono text-xs uppercase tracking-widest"
          style={{ color: "#A8C633" }}
        >
          Ongoing care
        </p>
        <h2
          className="text-balance text-3xl font-bold md:text-4xl"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F4F2EF",
          }}
        >
          Monthly care plans
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed" style={{ color: "#A8A29E" }}>
          Keep your product healthy after launch. Add any care plan to a Sage
          Build or Studio Engagement.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.22 } }}
            className="flex flex-col rounded-xl border p-6"
            style={{
              background: "#12110F",
              borderColor: "#2A2826",
            }}
          >
            <div
              className="mb-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: plan.color }}
            >
              {plan.name}
            </div>
            <div className="mb-4 flex items-end gap-1">
              <span
                className="text-4xl font-bold"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: "#F4F2EF",
                }}
              >
                {plan.price}
              </span>
              <span
                className="mb-1 font-mono text-sm"
                style={{ color: "#A8A29E" }}
              >
                {plan.cycle}
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "#A8A29E" }}>
              {plan.description}
            </p>
            <ul className="mb-8 flex flex-col gap-2.5">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">
                    <SmallCheck color={plan.color} />
                  </span>
                  <span className="text-sm" style={{ color: "#F4F2EF" }}>
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              <button
                className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors duration-150"
                style={{
                  background: "transparent",
                  color: plan.color,
                  border: `1px solid ${plan.color}40`,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    `${plan.color}12`
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    "transparent"
                }}
              >
                Add {plan.name}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

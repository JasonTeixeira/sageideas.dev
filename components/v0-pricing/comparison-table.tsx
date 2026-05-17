"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const features = [
  { label: "Codebase review", audit: true, build: true, studio: true },
  {
    label: "Architecture assessment",
    audit: true,
    build: true,
    studio: true,
  },
  { label: "CI/CD audit", audit: true, build: true, studio: true },
  { label: "Security scan", audit: true, build: true, studio: true },
  { label: "Written report", audit: true, build: true, studio: true },
  { label: "Implementation", audit: false, build: true, studio: true },
  { label: "Test suite", audit: false, build: true, studio: true },
  {
    label: "Post-launch support",
    audit: false,
    build: "30 days",
    studio: "Ongoing",
  },
  { label: "Weekly syncs", audit: false, build: false, studio: true },
  { label: "Dedicated Slack", audit: false, build: false, studio: true },
  {
    label: "Priority SLA",
    audit: false,
    build: false,
    studio: "< 4h",
  },
]

const tiers = [
  { key: "audit", label: "Sage Audit", color: "#0ED3CF" },
  { key: "build", label: "Sage Build", color: "#0ED3CF" },
  { key: "studio", label: "Studio", color: "#C7236E" },
]

function CheckCell({
  value,
  color,
}: {
  value: boolean | string
  color: string
}) {
  if (value === false) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-label="Not included"
      >
        <path
          d="M5 13L13 5M5 5l8 8"
          stroke="#3A3835"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (typeof value === "string") {
    return (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs"
        style={{
          color,
          background: `${color}15`,
          border: `1px solid ${color}30`,
        }}
      >
        {value}
      </span>
    )
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-label="Included"
    >
      <circle cx="9" cy="9" r="9" fill={color} fillOpacity="0.12" />
      <path
        d="M5.5 9l2.5 2.5 4.5-4.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TableRow({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const ref = useRef<HTMLTableRowElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <motion.tr
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="group border-b"
      style={{ borderColor: "#2A2826" }}
    >
      <td
        className="py-4 pl-6 pr-4 text-sm font-medium"
        style={{ color: "#F4F2EF" }}
      >
        {feature.label}
      </td>
      {tiers.map((tier) => (
        <td
          key={tier.key}
          className="px-6 py-4 text-center"
          style={{ minWidth: 120 }}
        >
          <div className="flex items-center justify-center">
            <CheckCell
              value={feature[tier.key as keyof typeof feature] as boolean | string}
              color={tier.color}
            />
          </div>
        </td>
      ))}
    </motion.tr>
  )
}

export function ComparisonTable() {
  const headRef = useRef<HTMLDivElement>(null)
  const headInView = useInView(headRef, { once: true, margin: "-80px" })

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      {/* Section header */}
      <motion.div
        ref={headRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        className="mb-12 text-center"
      >
        <p
          className="mb-3 font-mono text-xs uppercase tracking-widest"
          style={{ color: "#0ED3CF" }}
        >
          Feature breakdown
        </p>
        <h2
          className="text-balance text-3xl font-bold md:text-4xl"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F4F2EF",
          }}
        >
          What&apos;s included in each tier
        </h2>
      </motion.div>

      {/* Table — desktop only */}
      <div className="hidden overflow-hidden rounded-2xl border md:block" style={{ borderColor: "#2A2826" }}>
        <table className="w-full" style={{ background: "#12110F" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2A2826" }}>
              <th
                className="py-5 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#A8A29E" }}
              >
                Feature
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.key}
                  className="px-6 py-5 text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <TableRow key={feature.label} feature={feature} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards per feature */}
      <div className="flex flex-col gap-3 md:hidden">
        {features.map((feature, i) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.03 }}
            className="rounded-xl border p-4"
            style={{ background: "#12110F", borderColor: "#2A2826" }}
          >
            <p className="mb-3 text-sm font-semibold" style={{ color: "#F4F2EF" }}>
              {feature.label}
            </p>
            <div className="flex gap-6">
              {tiers.map((tier) => (
                <div key={tier.key} className="flex flex-col items-center gap-1">
                  <span className="text-xs" style={{ color: "#A8A29E" }}>
                    {tier.label}
                  </span>
                  <CheckCell
                    value={feature[tier.key as keyof typeof feature] as boolean | string}
                    color={tier.color}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

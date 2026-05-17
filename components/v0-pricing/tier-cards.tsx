"use client"

import { motion } from "framer-motion"

const tiers = [
  {
    id: "audit",
    name: "Sage Audit",
    price: "$1,500",
    cycle: "one-time",
    timeline: "~ 5 days",
    description:
      "A surgical review of your codebase, infra, and architecture. Walk away with a written remediation plan.",
    badge: null,
    accentColor: "#0ED3CF",
    ctaLabel: "Start with an Audit",
    ctaVariant: "teal" as const,
    features: [
      "Full codebase review",
      "Architecture assessment",
      "CI/CD pipeline audit",
      "Security scan & CVE report",
      "Written remediation report",
      "30-min debrief call",
    ],
  },
  {
    id: "build",
    name: "Sage Build",
    price: "$4,900",
    cycle: "one-time",
    timeline: "~ 2–4 weeks",
    description:
      "We take your brief and ship a production-ready feature, product, or technical foundation.",
    badge: "Most Popular",
    badgeVariant: "teal" as const,
    accentColor: "#0ED3CF",
    ctaLabel: "Book a Build",
    ctaVariant: "teal" as const,
    features: [
      "Everything in Sage Audit",
      "Full implementation & delivery",
      "Comprehensive test suite",
      "30-day post-launch support",
      "Deployment & CI/CD setup",
      "Video walkthrough handoff",
      "Source-controlled delivery",
    ],
  },
  {
    id: "studio",
    name: "Studio Engagement",
    price: "From $25k",
    cycle: "per quarter",
    timeline: "Ongoing",
    description:
      "A dedicated studio pod embedded with your team. Weekly syncs, priority SLA, and always-on execution.",
    badge: "Premium",
    badgeVariant: "magenta" as const,
    accentColor: "#C7236E",
    ctaLabel: "Apply for Studio",
    ctaVariant: "magenta" as const,
    features: [
      "Dedicated engineering pod",
      "Weekly strategy syncs",
      "Dedicated Slack channel",
      "Priority SLA (< 4h response)",
      "Unlimited build iterations",
      "Quarterly roadmap planning",
      "Executive stakeholder reports",
    ],
  },
]

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" fill={color} fillOpacity="0.12" />
      <path
        d="M5 8l2 2 4-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TierCards() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => {
          const isBuild = tier.id === "build"
          const isStudio = tier.id === "studio"

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="relative flex flex-col rounded-2xl p-8"
              style={{
                background: "#12110F",
                border: isBuild
                  ? "1px solid rgba(14,211,207,0.5)"
                  : isStudio
                    ? "1px solid rgba(199,35,110,0.35)"
                    : "1px solid #2A2826",
                boxShadow: isBuild
                  ? "0 0 40px rgba(14,211,207,0.12), 0 8px 32px rgba(0,0,0,0.4)"
                  : isStudio
                    ? "0 0 40px rgba(199,35,110,0.08), 0 8px 32px rgba(0,0,0,0.4)"
                    : "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Glow top edge for popular */}
              {isBuild && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, #0ED3CF, transparent)",
                  }}
                  aria-hidden="true"
                />
              )}
              {isStudio && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, #C7236E, transparent)",
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Badge */}
              {tier.badge && (
                <div className="mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
                    style={
                      tier.badgeVariant === "magenta"
                        ? {
                            background: "rgba(199,35,110,0.15)",
                            color: "#C7236E",
                            border: "1px solid rgba(199,35,110,0.3)",
                          }
                        : {
                            background: "rgba(14,211,207,0.1)",
                            color: "#0ED3CF",
                            border: "1px solid rgba(14,211,207,0.25)",
                          }
                    }
                  >
                    {tier.badgeVariant === "teal" && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "#0ED3CF" }}
                      />
                    )}
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Tier name */}
              <div
                className="mb-1 text-sm font-semibold uppercase tracking-widest"
                style={{ color: tier.accentColor }}
              >
                {tier.name}
              </div>

              {/* Price */}
              <div className="mb-1 flex items-end gap-1">
                <span
                  className="text-5xl font-bold tracking-tight"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "#F4F2EF",
                  }}
                >
                  {tier.price}
                </span>
              </div>
              <div
                className="mb-1 font-mono text-sm"
                style={{ color: "#A8A29E" }}
              >
                {tier.cycle}
              </div>

              {/* Timeline pill */}
              <div className="mb-6 mt-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs"
                  style={{
                    background: "rgba(42,40,38,0.8)",
                    color: "#A8A29E",
                    border: "1px solid #2A2826",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      stroke="#A8A29E"
                      strokeWidth="1"
                    />
                    <path
                      d="M6 3v3l2 1.5"
                      stroke="#A8A29E"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                  {tier.timeline}
                </span>
              </div>

              {/* Description */}
              <p
                className="mb-8 text-sm leading-relaxed"
                style={{ color: "#A8A29E" }}
              >
                {tier.description}
              </p>

              {/* Features */}
              <ul className="mb-10 flex flex-col gap-3">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">
                      <CheckIcon color={tier.accentColor} />
                    </span>
                    <span className="text-sm" style={{ color: "#F4F2EF" }}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold tracking-wide transition-all duration-200"
                  style={
                    tier.ctaVariant === "magenta"
                      ? {
                          background: "#C7236E",
                          color: "#F4F2EF",
                          boxShadow: "0 4px 20px rgba(199,35,110,0.3)",
                        }
                      : isBuild
                        ? {
                            background: "#0ED3CF",
                            color: "#09090B",
                            boxShadow: "0 4px 20px rgba(14,211,207,0.25)",
                          }
                        : {
                            background: "transparent",
                            color: "#0ED3CF",
                            border: "1px solid rgba(14,211,207,0.4)",
                          }
                  }
                >
                  {tier.ctaLabel}
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

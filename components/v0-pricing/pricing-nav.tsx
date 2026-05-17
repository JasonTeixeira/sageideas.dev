"use client"

import { motion } from "framer-motion"

export function PricingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md"
      style={{
        background: "rgba(9,9,11,0.85)",
        borderColor: "#2A2826",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: "#0ED3CF" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 10.5L7 3l5 7.5H2z"
                fill="#09090B"
              />
            </svg>
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "#F4F2EF" }}
          >
            Sage Ideas
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {["Work", "Studio", "Pricing", "Journal"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm transition-colors duration-150"
              style={{ color: item === "Pricing" ? "#F4F2EF" : "#A8A29E" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#F4F2EF")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  item === "Pricing" ? "#F4F2EF" : "#A8A29E")
              }
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <motion.a
          href="#"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            background: "#0ED3CF",
            color: "#09090B",
          }}
        >
          Book a call
        </motion.a>
      </div>
    </motion.nav>
  )
}

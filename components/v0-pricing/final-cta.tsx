"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section className="relative overflow-hidden px-6 py-32">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(14,211,207,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Top border gradient */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, #2A2826 20%, #2A2826 80%, transparent)",
        }}
        aria-hidden="true"
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: "rgba(14,211,207,0.1)",
            border: "1px solid rgba(14,211,207,0.25)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4l3 3"
              stroke="#0ED3CF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        <h2
          className="mb-4 text-balance text-4xl font-bold md:text-5xl"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F4F2EF",
          }}
        >
          Not sure which tier?
        </h2>
        <p
          className="mb-10 text-pretty text-lg leading-relaxed"
          style={{ color: "#A8A29E" }}
        >
          Book a free 30-minute discovery call.           {"We'll listen to where you are, what you need, and tell you honestly which engagement — if any — makes sense."}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all"
            style={{
              background: "#0ED3CF",
              color: "#09090B",
              boxShadow: "0 4px 24px rgba(14,211,207,0.3)",
            }}
          >
            Book a free discovery call
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.a>

          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all"
            style={{
              background: "transparent",
              color: "#A8A29E",
              border: "1px solid #2A2826",
            }}
          >
            View case studies
          </motion.a>
        </div>

        {/* Trust note */}
        <p className="mt-8 text-xs" style={{ color: "#3A3835" }}>
          No commitment. No sales pitch. Just an honest conversation.
        </p>
      </motion.div>
    </section>
  )
}

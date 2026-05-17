"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence, useInView } from "framer-motion"

const faqs = [
  {
    q: "What happens if the scope changes mid-project?",
    a: "We define scope collaboratively before any work begins. If new requirements surface, we pause, document the change, and agree on a scope addendum with adjusted timeline and cost before continuing. There are no surprise invoices.",
  },
  {
    q: "Can I upgrade from a Sage Audit to a Sage Build?",
    a: "Absolutely — and it's the most common path. The audit fee is credited toward your Build engagement. You get a clear remediation plan first, then we execute on it with full confidence in the scope.",
  },
  {
    q: "How does the Studio Engagement differ from hiring a contractor?",
    a: "A Studio Engagement brings a coordinated pod — strategist, designer, and engineer — rather than a single pair of hands. You get collective institutional knowledge, built-in design QA, and a dedicated Slack line with < 4h SLA, none of which a solo contractor can reliably offer.",
  },
  {
    q: "Do you work with early-stage startups or only established companies?",
    a: "Both. The Sage Audit and Sage Build are particularly well-suited for seed-stage teams who need to move fast without accumulating technical debt. Studio Engagements typically fit Series A+ companies with ongoing product velocity needs.",
  },
]

function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0]
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="border-b last:border-b-0"
      style={{ borderColor: "#2A2826" }}
    >
      <button
        className="flex w-full items-start justify-between gap-4 py-6 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span
          className="text-base font-semibold leading-snug"
          style={{ color: "#F4F2EF" }}
        >
          {faq.q}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="mt-0.5 shrink-0 text-xl font-light"
          style={{ color: "#0ED3CF" }}
          aria-hidden="true"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            style={{ overflow: "hidden" }}
          >
            <p
              className="pb-6 text-sm leading-relaxed"
              style={{ color: "#A8A29E" }}
            >
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        className="mb-10 text-center"
      >
        <p
          className="mb-3 font-mono text-xs uppercase tracking-widest"
          style={{ color: "#0ED3CF" }}
        >
          Common questions
        </p>
        <h2
          className="text-balance text-3xl font-bold md:text-4xl"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F4F2EF",
          }}
        >
          Frequently asked
        </h2>
      </motion.div>

      <div
        className="rounded-2xl border p-2 md:p-4"
        style={{ background: "#12110F", borderColor: "#2A2826" }}
      >
        <div className="px-4">
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.q}
              faq={faq}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

"use client"

import { PricingNav } from "@/components/pricing-nav"
import { PricingHero } from "@/components/pricing-hero"
import { TierCards } from "@/components/tier-cards"
import { ComparisonTable } from "@/components/comparison-table"
import { CarePlans } from "@/components/care-plans"
import { FAQAccordion } from "@/components/faq-accordion"
import { FinalCTA } from "@/components/final-cta"

interface PricingPageProps {
  heroImageSrc?: string
}

export default function PricingPage({ heroImageSrc }: PricingPageProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#09090B", color: "#F4F2EF" }}
    >
      <PricingNav />

      <main>
        <PricingHero heroImageSrc={heroImageSrc} />
        <TierCards />
        <ComparisonTable />
        <CarePlans />
        <FAQAccordion />
        <FinalCTA />
      </main>

      {/* Footer */}
      <footer
        className="border-t px-6 py-10"
        style={{ borderColor: "#2A2826" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs md:flex-row"
          style={{ color: "#3A3835" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded"
              style={{ background: "#0ED3CF" }}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 10.5L7 3l5 7.5H2z" fill="#09090B" />
              </svg>
            </div>
            <span>Sage Ideas Studio © 2025</span>
          </div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="transition-colors duration-150 hover:text-[#A8A29E]"
                style={{ color: "#3A3835" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

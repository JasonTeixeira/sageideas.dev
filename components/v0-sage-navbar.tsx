"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Brain: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.96-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.96-3.19A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.96-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.96-3.19A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  Layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  ),
  Zap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  Code: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Package: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
  Repeat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="m7 22-4-4 4-4"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  PlayCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="16" y1="18" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4"/>
      <path d="M16 2v4"/>
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <path d="M3 10h18"/>
    </svg>
  ),
  Industry: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    </svg>
  ),
  Tag: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
    </svg>
  ),
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEFAULT_LOGO = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <defs>
      <linearGradient id="sage-lg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0ED3CF"/>
        <stop offset="1" stopColor="#0ab3b0"/>
      </linearGradient>
    </defs>
    <rect width="28" height="28" rx="7" fill="url(#sage-lg)"/>
    <path d="M8 20L14 8L20 20" stroke="#09090B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 16H17.5" stroke="#09090B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SERVICES_DATA = {
  col1: {
    heading: "AI Flagship",
    items: [
      { icon: <Icons.Brain />, label: "AI Strategy Sprint", desc: "Full discovery + roadmap in 2 weeks", price: "$4,800" },
      { icon: <Icons.Sparkles />, label: "LLM Integration", desc: "Custom model fine-tuning & deployment", price: "$12,000" },
      { icon: <Icons.Zap />, label: "Agent Workflows", desc: "Autonomous multi-step business agents", price: "$9,500" },
      { icon: <Icons.Code />, label: "RAG Systems", desc: "Knowledge bases & document intelligence", price: "$7,200" },
      { icon: <Icons.Globe />, label: "AI Ops & Monitoring", desc: "Production observability & drift alerts", price: "$3,600/mo" },
    ],
  },
  col2: {
    heading: "Productized",
    items: [
      { icon: <Icons.Package />, label: "Starter Pack", desc: "One-page AI audit + quick wins", price: "$1,200" },
      { icon: <Icons.Layers />, label: "Growth Bundle", desc: "3 automations + analytics dashboard", price: "$5,400" },
      { icon: <Icons.Repeat />, label: "Monthly Retainer", desc: "Ongoing AI ops + 20hrs dev/mo", price: "$6,000/mo" },
      { icon: <Icons.Sparkles />, label: "Enterprise Suite", desc: "Custom scoping, SLA, dedicated team", price: "Custom" },
    ],
  },
  col3: {
    heading: "By Context",
    items: [
      { icon: <Icons.Industry />, label: "Industries", desc: "Finance, Health, Legal, eCommerce" },
      { icon: <Icons.Zap />, label: "Capabilities", desc: "Chat, Vision, Voice, Data pipelines" },
      { icon: <Icons.Tag />, label: "Pricing Guide", desc: "Compare tiers & build your plan" },
    ],
  },
};

const RESOURCES_DATA = [
  { icon: <Icons.BookOpen />, label: "Playbooks", desc: "Step-by-step AI implementation guides" },
  { icon: <Icons.PlayCircle />, label: "Case Studies", desc: "Real results from real clients" },
  { icon: <Icons.Sparkles />, label: "AI Glossary", desc: "Plain-English definitions for every term" },
  { icon: <Icons.Code />, label: "Open Templates", desc: "Free prompts & workflow starters" },
  { icon: <Icons.BookOpen />, label: "Newsletter", desc: "Weekly signal on AI for builders" },
  { icon: <Icons.Calendar />, label: "Webinars", desc: "Live sessions with the Sage team" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SageNavbarProps {
  logo?: React.ReactNode;
  activeItem?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ServiceItem({
  icon,
  label,
  desc,
  price,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  price?: string;
}) {
  return (
    <a
      href="#"
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-[#1a1816]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2A2826] bg-[#141210] text-[#A8A29E] transition-colors duration-200 group-hover:border-[#0ED3CF]/30 group-hover:text-[#0ED3CF]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-[#F4F2EF] transition-colors duration-200 group-hover:text-white">
            {label}
          </span>
          {price && (
            <span className="shrink-0 rounded-full border border-[#2A2826] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#A8A29E] transition-colors duration-200 group-hover:border-[#0ED3CF]/20 group-hover:text-[#0ED3CF]">
              {price}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#A8A29E]">{desc}</p>
      </div>
    </a>
  );
}

function ResourceItem({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <a
      href="#"
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-[#1a1816]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2A2826] bg-[#141210] text-[#A8A29E] transition-colors duration-200 group-hover:border-[#0ED3CF]/30 group-hover:text-[#0ED3CF]">
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-medium text-[#F4F2EF] transition-colors duration-200 group-hover:text-white">
          {label}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#A8A29E]">{desc}</p>
      </div>
    </a>
  );
}

// ─── Mega-menu: Services ──────────────────────────────────────────────────────

function ServicesMegaMenu() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-1/2 top-full mt-2 w-[820px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#2A2826] bg-[#0f0e0c]/96 shadow-2xl shadow-black/60 backdrop-blur-xl"
      style={{ transformOrigin: "top center" }}
    >
      {/* Subtle top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0ED3CF]/40 to-transparent" />

      <div className="grid grid-cols-3 gap-0 divide-x divide-[#2A2826] p-2">
        {/* Column 1 */}
        <div className="px-2 py-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0ED3CF]">
            {SERVICES_DATA.col1.heading}
          </p>
          <div className="space-y-0.5">
            {SERVICES_DATA.col1.items.map((item) => (
              <ServiceItem key={item.label} {...item} />
            ))}
          </div>
        </div>

        {/* Column 2 */}
        <div className="px-2 py-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0ED3CF]">
            {SERVICES_DATA.col2.heading}
          </p>
          <div className="space-y-0.5">
            {SERVICES_DATA.col2.items.map((item) => (
              <ServiceItem key={item.label} {...item} />
            ))}
          </div>
        </div>

        {/* Column 3 */}
        <div className="px-2 py-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0ED3CF]">
            {SERVICES_DATA.col3.heading}
          </p>
          <div className="space-y-0.5">
            {SERVICES_DATA.col3.items.map((item) => (
              <ServiceItem key={item.label} {...item} />
            ))}
          </div>
          {/* Spacer + floating card */}
          <div className="mt-4 rounded-xl border border-[#2A2826] bg-[#141210] p-4">
            <p className="text-[12px] font-semibold text-[#F4F2EF]">New: AI Agent Studio</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#A8A29E]">
              Build production agents with no-code flows.
            </p>
            <a
              href="#"
              className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#0ED3CF] transition-opacity hover:opacity-80"
            >
              Explore beta <Icons.ArrowRight />
            </a>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between border-t border-[#2A2826] bg-[#141210]/60 px-6 py-3">
        <p className="text-[12px] text-[#A8A29E]">
          Not sure where to start?{" "}
          <span className="text-[#F4F2EF]">We&apos;ll scope it for you — free.</span>
        </p>
        <a
          href="#"
          className="flex items-center gap-2 rounded-lg bg-[#0ED3CF]/10 px-4 py-1.5 text-[12px] font-semibold text-[#0ED3CF] transition-all duration-200 hover:bg-[#0ED3CF]/20"
        >
          Book a free call <Icons.ArrowRight />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Mega-menu: Resources ─────────────────────────────────────────────────────

function ResourcesMegaMenu() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="absolute left-1/2 top-full mt-2 w-[440px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#2A2826] bg-[#0f0e0c]/96 shadow-2xl shadow-black/60 backdrop-blur-xl"
      style={{ transformOrigin: "top center" }}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0ED3CF]/40 to-transparent" />
      <div className="grid grid-cols-2 gap-0 p-2">
        {RESOURCES_DATA.map((item) => (
          <ResourceItem key={item.label} {...item} />
        ))}
      </div>
      <div className="border-t border-[#2A2826] bg-[#141210]/60 px-5 py-3">
        <a
          href="#"
          className="flex items-center gap-2 text-[12px] font-semibold text-[#A8A29E] transition-colors duration-200 hover:text-[#F4F2EF]"
        >
          Browse all resources <Icons.ArrowRight />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggle = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col bg-[#0C0B09] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2826] px-6 py-5">
              <div className="flex items-center gap-3">
                {DEFAULT_LOGO}
                <span
                  className="text-[13px] font-semibold tracking-[0.08em] text-[#F4F2EF]"
                  style={{ letterSpacing: "0.08em" }}
                >
                  SAGE IDEAS
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2826] text-[#A8A29E] transition-colors hover:border-[#3a3633] hover:text-[#F4F2EF]"
                aria-label="Close menu"
              >
                <Icons.X />
              </button>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Services */}
              <div>
                <button
                  onClick={() => toggle("services")}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[14px] font-medium text-[#F4F2EF] transition-colors hover:bg-[#1a1816]"
                >
                  Services
                  <Icons.ChevronDown
                    className={`transition-transform duration-200 ${expandedSection === "services" ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSection === "services" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 mt-1 space-y-0.5 border-l border-[#2A2826] pl-3 pb-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0ED3CF]">
                          AI Flagship
                        </p>
                        {SERVICES_DATA.col1.items.map((item) => (
                          <a
                            key={item.label}
                            href="#"
                            className="flex items-center justify-between rounded-lg px-2 py-2 text-[13px] text-[#A8A29E] transition-colors hover:bg-[#1a1816] hover:text-[#F4F2EF]"
                          >
                            <span>{item.label}</span>
                            <span className="text-[11px] text-[#0ED3CF]">{item.price}</span>
                          </a>
                        ))}
                        <div className="my-2 border-t border-[#2A2826]" />
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0ED3CF]">
                          Productized
                        </p>
                        {SERVICES_DATA.col2.items.map((item) => (
                          <a
                            key={item.label}
                            href="#"
                            className="flex items-center justify-between rounded-lg px-2 py-2 text-[13px] text-[#A8A29E] transition-colors hover:bg-[#1a1816] hover:text-[#F4F2EF]"
                          >
                            <span>{item.label}</span>
                            <span className="text-[11px] text-[#0ED3CF]">{item.price}</span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resources */}
              <div>
                <button
                  onClick={() => toggle("resources")}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[14px] font-medium text-[#F4F2EF] transition-colors hover:bg-[#1a1816]"
                >
                  Resources
                  <Icons.ChevronDown
                    className={`transition-transform duration-200 ${expandedSection === "resources" ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSection === "resources" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 mt-1 space-y-0.5 border-l border-[#2A2826] pl-3 pb-2">
                        {RESOURCES_DATA.map((item) => (
                          <a
                            key={item.label}
                            href="#"
                            className="block rounded-lg px-2 py-2 text-[13px] text-[#A8A29E] transition-colors hover:bg-[#1a1816] hover:text-[#F4F2EF]"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Direct links */}
              {["Work", "Pricing"].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="block rounded-xl px-3 py-3 text-[14px] font-medium text-[#F4F2EF] transition-colors hover:bg-[#1a1816]"
                >
                  {label}
                </a>
              ))}

              {/* Divider */}
              <div className="my-3 border-t border-[#2A2826]" />

              {/* Search */}
              <button className="flex w-full items-center gap-3 rounded-xl border border-[#2A2826] bg-[#141210] px-3 py-2.5 text-[13px] text-[#A8A29E] transition-colors hover:border-[#3a3633] hover:text-[#F4F2EF]">
                <Icons.Search />
                <span>Search anything…</span>
                <span className="ml-auto flex items-center gap-1 text-[11px]">
                  <kbd className="rounded border border-[#2A2826] px-1.5 py-0.5 font-mono">⌘</kbd>
                  <kbd className="rounded border border-[#2A2826] px-1.5 py-0.5 font-mono">K</kbd>
                </span>
              </button>
            </div>

            {/* Footer CTAs */}
            <div className="border-t border-[#2A2826] p-4 space-y-2">
              <button className="w-full rounded-xl border border-[#2A2826] bg-transparent py-2.5 text-[14px] font-medium text-[#F4F2EF] transition-colors hover:border-[#3a3633] hover:bg-[#1a1816]">
                Log in
              </button>
              <button className="w-full rounded-xl bg-[#0ED3CF] py-2.5 text-[14px] font-semibold text-[#09090B] transition-opacity hover:opacity-90">
                Book a Call
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SageNavbar({ logo, activeItem }: SageNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMenuEnter = useCallback((name: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMenu(name);
  }, []);

  const handleMenuLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 120);
  }, []);

  const navLinks = [
    { label: "Services", hasMenu: true },
    { label: "Resources", hasMenu: true },
    { label: "Work", hasMenu: false },
    { label: "Pricing", hasMenu: false },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 ease-out ${
          scrolled
            ? "border-b border-[#2A2826]/70 bg-[#09090B]/92 backdrop-blur-xl shadow-lg shadow-black/30"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav
          ref={menuRef}
          className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-5 lg:px-8"
          aria-label="Main navigation"
        >
          {/* ── Left: Logo ── */}
          <a href="/" className="flex items-center gap-3 shrink-0" aria-label="Sage Ideas home">
            {logo ?? DEFAULT_LOGO}
            <span
              className="text-[15px] font-semibold text-[#F4F2EF] tracking-[0.08em] select-none hidden sm:block"
            >
              SAGE IDEAS
            </span>
          </a>

          {/* ── Center: Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(({ label, hasMenu }) => {
              const isActive = activeItem === label || activeMenu === label;
              return (
                <div key={label} className="relative">
                  {hasMenu ? (
                    <button
                      onMouseEnter={() => handleMenuEnter(label)}
                      onMouseLeave={handleMenuLeave}
                      onFocus={() => handleMenuEnter(label)}
                      onBlur={handleMenuLeave}
                      aria-expanded={activeMenu === label}
                      aria-haspopup="true"
                      className={`group flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#0ED3CF]/8 text-[#0ED3CF]"
                          : "text-[#A8A29E] hover:bg-[#1a1816] hover:text-[#F4F2EF]"
                      }`}
                    >
                      {label}
                      <Icons.ChevronDown
                        className={`transition-transform duration-200 ${activeMenu === label ? "rotate-180 text-[#0ED3CF]" : ""}`}
                      />
                    </button>
                  ) : (
                    <a
                      href="#"
                      className={`flex items-center rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#0ED3CF]/8 text-[#0ED3CF]"
                          : "text-[#A8A29E] hover:bg-[#1a1816] hover:text-[#F4F2EF]"
                      }`}
                    >
                      {label}
                    </a>
                  )}

                  {/* Mega-menus */}
                  {hasMenu && (
                    <div
                      onMouseEnter={() => handleMenuEnter(label)}
                      onMouseLeave={handleMenuLeave}
                    >
                      <AnimatePresence>
                        {activeMenu === label && label === "Services" && (
                          <ServicesMegaMenu key="services-menu" />
                        )}
                        {activeMenu === label && label === "Resources" && (
                          <ResourcesMegaMenu key="resources-menu" />
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-2">
            {/* Search — desktop */}
            <button
              className="hidden lg:flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#141210] px-3 py-1.5 text-[12px] text-[#A8A29E] transition-all duration-200 hover:border-[#3a3633] hover:text-[#F4F2EF]"
              aria-label="Search (Cmd+K)"
            >
              <Icons.Search />
              <span className="hidden xl:block">Search</span>
              <span className="hidden xl:flex items-center gap-1">
                <kbd className="rounded border border-[#2A2826] bg-[#1a1816] px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
                <kbd className="rounded border border-[#2A2826] bg-[#1a1816] px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
              </span>
            </button>

            {/* Login — desktop */}
            <button className="hidden lg:flex items-center rounded-lg border border-[#2A2826] bg-transparent px-4 py-1.5 text-[13px] font-medium text-[#F4F2EF] transition-all duration-200 hover:border-[#3a3633] hover:bg-[#1a1816]">
              Log in
            </button>

            {/* CTA */}
            <a
              href="#"
              className="hidden lg:flex items-center gap-2 rounded-lg bg-[#0ED3CF] px-4 py-1.5 text-[13px] font-semibold text-[#09090B] transition-all duration-200 hover:bg-[#0bc4c0] active:scale-[0.97]"
            >
              Book a Call
            </a>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-[#2A2826] text-[#A8A29E] transition-colors hover:border-[#3a3633] hover:text-[#F4F2EF]"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Icons.Menu />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useMotionValue, useSpring, animate } from "framer-motion";

/* ─── Brand palette ─────────────────────────────────────────── */
const COLOR = {
  teal: "#0ED3CF",
  coral: "#E85D3A",
  lime: "#A8C633",
  magenta: "#C7236E",
} as const;

type Category = "Fintech" | "AI/ML" | "Infrastructure" | "Product" | "DevTools";

const CATEGORY_COLOR: Record<Category, string> = {
  Fintech: COLOR.teal,
  "AI/ML": COLOR.coral,
  Infrastructure: COLOR.lime,
  Product: COLOR.magenta,
  DevTools: COLOR.teal,
};

/* ─── Data ──────────────────────────────────────────────────── */
interface Metric {
  value: number;
  suffix: string;
  label: string;
}

interface CaseStudy {
  slug: string;
  name: string;
  category: Category;
  description: string;
  image: string;
  imageAlt: string;
  metrics: Metric[];
  tech: string[];
}

const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "meridian-banking",
    name: "Meridian Banking",
    category: "Fintech",
    description: "End-to-end design system and data platform for a next-generation neobank serving 2M+ customers.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Meridian Banking dashboard screenshot",
    metrics: [
      { value: 185, suffix: "", label: "Tables" },
      { value: 69, suffix: "", label: "APIs" },
      { value: 2.1, suffix: "M", label: "Users" },
      { value: 99, suffix: "%", label: "Uptime" },
    ],
    tech: ["Next.js", "TypeScript", "Postgres", "Kafka"],
  },
  {
    slug: "atlas-inference",
    name: "Atlas Inference",
    category: "AI/ML",
    description: "Real-time model inference platform processing 40B tokens/day with sub-50ms latency at global scale.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Atlas Inference model console screenshot",
    metrics: [
      { value: 40, suffix: "B", label: "Tokens/day" },
      { value: 48, suffix: "ms", label: "P99 latency" },
      { value: 12, suffix: "", label: "Regions" },
      { value: 99.9, suffix: "%", label: "SLA" },
    ],
    tech: ["PyTorch", "Rust", "CUDA", "Kubernetes"],
  },
  {
    slug: "strata-platform",
    name: "Strata Platform",
    category: "Infrastructure",
    description: "Cloud-native developer platform that cut deployment time from 4 hours to 8 minutes for 600+ engineers.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Strata deployment pipeline screenshot",
    metrics: [
      { value: 600, suffix: "+", label: "Engineers" },
      { value: 8, suffix: "min", label: "Deploy time" },
      { value: 97, suffix: "%", label: "Error reduction" },
      { value: 4.2, suffix: "x", label: "Faster CI" },
    ],
    tech: ["Terraform", "Go", "gRPC", "Helm"],
  },
  {
    slug: "nova-health",
    name: "Nova Health",
    category: "Product",
    description: "Patient-centered care platform connecting 180 clinics with real-time scheduling and EHR integration.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Nova Health patient portal screenshot",
    metrics: [
      { value: 180, suffix: "", label: "Clinics" },
      { value: 3.4, suffix: "M", label: "Appointments" },
      { value: 41, suffix: "%", label: "No-show drop" },
      { value: 4.8, suffix: "★", label: "App rating" },
    ],
    tech: ["React Native", "GraphQL", "HL7 FHIR", "Redis"],
  },
  {
    slug: "forge-cli",
    name: "Forge CLI",
    category: "DevTools",
    description: "Open-source developer toolkit with 28K GitHub stars, adopted by teams at Stripe, Notion, and Linear.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Forge CLI terminal interface screenshot",
    metrics: [
      { value: 28, suffix: "K", label: "GitHub stars" },
      { value: 140, suffix: "K", label: "Downloads/mo" },
      { value: 320, suffix: "+", label: "Contributors" },
      { value: 98, suffix: "%", label: "Satisfaction" },
    ],
    tech: ["Node.js", "Ink", "Commander", "Vitest"],
  },
  {
    slug: "quill-intelligence",
    name: "Quill Intelligence",
    category: "AI/ML",
    description: "Generative analytics engine that transforms raw data into executive-ready narratives in seconds.",
    image: "/placeholder.svg?height=400&width=720",
    imageAlt: "Quill Intelligence analytics dashboard screenshot",
    metrics: [
      { value: 9, suffix: "s", label: "Report gen" },
      { value: 250, suffix: "+", label: "Data sources" },
      { value: 78, suffix: "%", label: "Time saved" },
      { value: 1.2, suffix: "M", label: "Reports/mo" },
    ],
    tech: ["LangChain", "Python", "dbt", "Snowflake"],
  },
];

/* ─── Animated counter ──────────────────────────────────────── */
function Counter({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const isDecimal = value % 1 !== 0;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        setDisplay(isDecimal ? parseFloat(v.toFixed(1)) : Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

/* ─── Browser chrome mockup ─────────────────────────────────── */
function BrowserChrome({ image, imageAlt, accentColor }: { image: string; imageAlt: string; accentColor: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-t-lg"
      style={{ border: `1px solid #2A2826`, borderBottom: "none" }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: "#1A1816", borderBottom: "1px solid #2A2826" }}
      >
        {/* Traffic lights */}
        <span className="flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </span>
        {/* Fake URL bar */}
        <div
          className="flex-1 mx-2 h-5 rounded flex items-center px-2"
          style={{ background: "#0D0C0A", border: "1px solid #2A2826" }}
        >
          <span className="text-[10px] font-mono" style={{ color: "#A8A29E" }}>
            sageide.as/work
          </span>
        </div>
        {/* Icon placeholders */}
        <span className="flex gap-1">
          {[0, 1].map((i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: "#2A2826" }} />
          ))}
        </span>
      </div>

      {/* Screenshot area */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <motion.div
          className="absolute inset-0"
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
          {/* subtle gradient overlay at bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{ background: "linear-gradient(to top, #12110F 0%, transparent 100%)" }}
          />
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Single card ───────────────────────────────────────────── */
function CaseStudyCard({ study, index }: { study: CaseStudy; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const accentColor = CATEGORY_COLOR[study.category];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (index % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/work/${study.slug}`} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ED3CF] rounded-xl">
        <motion.div
          className="relative rounded-xl overflow-hidden cursor-pointer"
          style={{
            background: "#12110F",
            border: "1px solid #2A2826",
            boxShadow: "0 2px 16px 0 rgba(0,0,0,0.4)",
          }}
          whileHover={{
            y: -6,
            boxShadow: `0 12px 48px -8px ${accentColor}28, 0 2px 16px 0 rgba(0,0,0,0.6)`,
            borderColor: `${accentColor}55`,
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow edge on hover */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              background: `radial-gradient(ellipse 60% 30% at 50% 0%, ${accentColor}18, transparent 70%)`,
              zIndex: 1,
            }}
          />

          {/* Browser mockup */}
          <BrowserChrome image={study.image} imageAlt={study.imageAlt} accentColor={accentColor} />

          {/* Card body */}
          <div className="px-5 pb-5 pt-4 flex flex-col gap-4" style={{ zIndex: 2, position: "relative" }}>
            {/* Category badge + project name */}
            <div className="flex flex-col gap-2">
              <span
                className="inline-flex items-center self-start text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded"
                style={{
                  color: accentColor,
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}30`,
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: "0.12em",
                }}
              >
                {study.category}
              </span>
              <h2
                className="text-2xl leading-tight text-balance"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: "#F4F2EF",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                {study.name}
              </h2>
              <p
                className="text-sm leading-relaxed line-clamp-2"
                style={{ color: "#A8A29E" }}
              >
                {study.description}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#2A2826" }} />

            {/* Metric counters */}
            <div className="grid grid-cols-4 gap-2">
              {study.metrics.map((m) => (
                <div key={m.label} className="flex flex-col gap-0.5">
                  <span
                    className="text-base font-semibold tabular-nums"
                    style={{ color: accentColor, fontFamily: "'Geist Mono', monospace" }}
                  >
                    <Counter value={m.value} suffix={m.suffix} inView={inView} />
                  </span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "#A8A29E", letterSpacing: "0.08em" }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#2A2826" }} />

            {/* Tech stack pills */}
            <div className="flex flex-wrap gap-1.5 items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {study.tech.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      background: "#1C1A18",
                      color: "#A8A29E",
                      border: "1px solid #2A2826",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {/* Arrow CTA */}
              <motion.span
                className="ml-auto flex items-center gap-1 text-xs font-medium"
                style={{ color: accentColor }}
                initial={{ x: 0 }}
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                <span>View case study</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─── Header ────────────────────────────────────────────────── */
function PortfolioHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.header
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mb-16 md:mb-20"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-3">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-px"
              style={{ background: COLOR.teal }}
            />
            <span
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: COLOR.teal, fontFamily: "'Geist Mono', monospace" }}
            >
              Selected Work
            </span>
          </div>
          {/* Headline */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-none text-balance"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: "#F4F2EF",
              fontWeight: 400,
              letterSpacing: "-0.025em",
            }}
          >
            Built for
            <br />
            <em style={{ color: COLOR.teal, fontStyle: "italic" }}>scale.</em>
          </h1>
        </div>

        {/* Right column: tagline + stats */}
        <div className="flex flex-col gap-6 max-w-xs mt-2">
          <p className="text-sm leading-relaxed" style={{ color: "#A8A29E" }}>
            Six engagements. Six industries. One studio obsessed with craft, clarity, and code that ships.
          </p>
          <div className="flex gap-6">
            {[
              { n: "6", label: "Case studies" },
              { n: "∞", label: "Details matter" },
            ].map(({ n, label }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span
                  className="text-2xl font-semibold"
                  style={{ color: "#F4F2EF", fontFamily: "'Geist Mono', monospace" }}
                >
                  {n}
                </span>
                <span className="text-xs uppercase tracking-widest" style={{ color: "#A8A29E" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Footer strip ──────────────────────────────────────────── */
function PortfolioFooter() {
  return (
    <footer
      className="mt-20 pt-8 flex items-center justify-between flex-wrap gap-4"
      style={{ borderTop: "1px solid #2A2826" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-xl tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#F4F2EF" }}
        >
          Sage Ideas
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-mono"
          style={{ background: `${COLOR.teal}18`, color: COLOR.teal, border: `1px solid ${COLOR.teal}30` }}
        >
          EST. 2019
        </span>
      </div>
      <p className="text-xs" style={{ color: "#A8A29E" }}>
        Available for select engagements in 2025 —{" "}
        <a
          href="mailto:hello@sageideas.co"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity"
          style={{ color: "#F4F2EF" }}
        >
          hello@sageideas.co
        </a>
      </p>
    </footer>
  );
}

/* ─── Grid ──────────────────────────────────────────────────── */
export default function CaseStudyGrid() {
  return (
    <div
      className="min-h-screen px-4 py-16 md:px-8 lg:px-16 xl:px-24 max-w-[1440px] mx-auto"
      style={{ background: "#09090B" }}
    >
      {/* Nav bar */}
      <nav className="flex items-center justify-between mb-20">
        <span
          className="text-base font-medium tracking-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#F4F2EF" }}
        >
          Sage<span style={{ color: COLOR.teal }}>.</span>
        </span>
        <div className="flex items-center gap-8">
          {["Work", "Process", "Studio", "Contact"].map((item) => (
            <Link
              key={item}
              href="/"
              className="text-xs uppercase tracking-widest transition-colors duration-200 hover:text-[#F4F2EF]"
              style={{ color: "#A8A29E", letterSpacing: "0.12em" }}
            >
              {item}
            </Link>
          ))}
        </div>
      </nav>

      {/* Header */}
      <PortfolioHeader />

      {/* Filter pills */}
      <CategoryFilter />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">
        {CASE_STUDIES.map((study, i) => (
          <CaseStudyCard key={study.slug} study={study} index={i} />
        ))}
      </div>

      {/* Footer */}
      <PortfolioFooter />
    </div>
  );
}

/* ─── Category filter ───────────────────────────────────────── */
function CategoryFilter() {
  const categories: (Category | "All")[] = ["All", "Fintech", "AI/ML", "Infrastructure", "Product", "DevTools"];
  const [active, setActive] = useState<Category | "All">("All");

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      {categories.map((cat) => {
        const color = cat === "All" ? "#F4F2EF" : CATEGORY_COLOR[cat as Category];
        const isActive = active === cat;
        return (
          <motion.button
            key={cat}
            onClick={() => setActive(cat)}
            className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full transition-colors duration-200"
            style={{
              fontFamily: "'Geist Mono', monospace",
              background: isActive ? `${color}18` : "transparent",
              color: isActive ? color : "#A8A29E",
              border: isActive ? `1px solid ${color}40` : "1px solid #2A2826",
              letterSpacing: "0.1em",
            }}
            whileTap={{ scale: 0.96 }}
          >
            {cat}
          </motion.button>
        );
      })}
    </div>
  );
}

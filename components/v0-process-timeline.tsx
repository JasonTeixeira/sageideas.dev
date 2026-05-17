"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
  useSpring,
} from "framer-motion";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────── */
interface Stage {
  id: string;
  number: string;
  title: string;
  tagline: string;
  body: string;
  color: string;
  glowColor: string;
  icon: React.FC<{ className?: string }>;
  deliverables: string[];
}

/* ─── Icons ──────────────────────────────────────────────── */
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── Data ───────────────────────────────────────────────── */
const STAGES: Stage[] = [
  {
    id: "discover",
    number: "01",
    title: "Discover",
    tagline: "Map the problem space",
    body: "Map the problem, define scope, agree on outcomes before code. You get a scope document, not a sales pitch.",
    color: "#0ED3CF",
    glowColor: "rgba(14,211,207,0.18)",
    icon: CompassIcon,
    deliverables: [
      "Problem statement & success criteria",
      "Stakeholder alignment doc",
      "Scoped feature set (in / out of bounds)",
      "Technical risk register",
      "Signed scope document",
    ],
  },
  {
    id: "architect",
    number: "02",
    title: "Architect",
    tagline: "Design before you build",
    body: "System design, stack confirmation, data models, API contracts. We show you what we build before we build it.",
    color: "#E85D3A",
    glowColor: "rgba(232,93,58,0.18)",
    icon: LayersIcon,
    deliverables: [
      "Architecture decision records (ADRs)",
      "Entity-relationship diagram",
      "API contract (OpenAPI / tRPC)",
      "Infrastructure topology diagram",
      "Component & data-flow diagrams",
    ],
  },
  {
    id: "build",
    number: "03",
    title: "Build",
    tagline: "Production-grade from day one",
    body: "Production-grade implementation with CI gates, typed code, test coverage, and weekly progress updates. No ghost-mode.",
    color: "#A8C633",
    glowColor: "rgba(168,198,51,0.18)",
    icon: TerminalIcon,
    deliverables: [
      "TypeScript codebase with strict config",
      "CI/CD pipeline (lint → test → deploy)",
      "≥80% test coverage on critical paths",
      "Weekly Loom progress updates",
      "Private repo with commit history",
    ],
  },
  {
    id: "operate",
    number: "04",
    title: "Operate",
    tagline: "Ship and stay accountable",
    body: "Deployment, monitoring, documentation, handoff — or ongoing fractional support. We don\u2019t ship and disappear.",
    color: "#C7236E",
    glowColor: "rgba(199,35,110,0.18)",
    icon: ShieldIcon,
    deliverables: [
      "Production deployment & DNS config",
      "Observability stack (logs, metrics, alerts)",
      "Runbook & ops documentation",
      "60-day bug warranty post-launch",
      "Optional: fractional on-call retainer",
    ],
  },
];

/* ─── Animated connector line ───────────────────────────── */
function TimelineConnector({ progress }: { progress: number }) {
  const pathLength = progress;

  return (
    <div className="absolute left-[1.9375rem] top-0 bottom-0 w-px pointer-events-none">
      {/* Static faint track */}
      <div className="absolute inset-0 w-px bg-border" />
      {/* Animated glowing line */}
      <motion.div
        className="absolute top-0 left-0 w-px origin-top"
        style={{
          height: "100%",
          scaleY: pathLength,
          background:
            "linear-gradient(to bottom, #0ED3CF 0%, #E85D3A 33%, #A8C633 66%, #C7236E 100%)",
          boxShadow: "0 0 8px 1px rgba(14,211,207,0.35)",
        }}
      />
    </div>
  );
}

/* ─── Stage dot with pulse ───────────────────────────────── */
function StageDot({
  color,
  glowColor,
  isVisible,
}: {
  color: string;
  glowColor: string;
  isVisible: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center w-[2rem] h-[2rem] flex-shrink-0 mt-1">
      {/* Pulse ring */}
      {isVisible && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.5 }}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{
            duration: 1.6,
            ease: "easeOut",
            repeat: 2,
            repeatDelay: 0.4,
          }}
        />
      )}
      {/* Dot */}
      <motion.span
        className="relative z-10 w-3 h-3 rounded-full border-2"
        style={{
          backgroundColor: isVisible ? color : "transparent",
          borderColor: color,
          boxShadow: isVisible ? `0 0 12px 3px ${glowColor}` : "none",
        }}
        animate={isVisible ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

/* ─── Individual stage card ──────────────────────────────── */
function StageCard({
  stage,
  index,
}: {
  stage: Stage;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-15% 0px -15% 0px" });
  const [expanded, setExpanded] = useState(false);

  const Icon = stage.icon;

  const cardVariants = {
    hidden: { opacity: 0, x: 32, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.7,
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div ref={ref} className="flex gap-6 md:gap-10">
      {/* Left: number + dot (timeline spine) */}
      <div className="flex flex-col items-center gap-0 w-8 flex-shrink-0">
        <StageDot color={stage.color} glowColor={stage.glowColor} isVisible={isInView} />
      </div>

      {/* Right: card */}
      <motion.div
        className="flex-1 mb-20 md:mb-28"
        variants={cardVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {/* Stage header row */}
        <div className="flex items-start gap-4 mb-5">
          {/* Icon container */}
          <motion.div
            className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: `${stage.color}12`,
              borderColor: `${stage.color}30`,
              boxShadow: isInView ? `0 0 20px 0px ${stage.glowColor}` : "none",
            }}
            animate={isInView ? { boxShadow: `0 0 20px 2px ${stage.glowColor}` } : {}}
            transition={{ duration: 0.5 }}
          >
            <Icon className="w-5 h-5" style={{ color: stage.color } as React.CSSProperties} />
          </motion.div>

          <div className="pt-0.5">
            {/* Mono stage number */}
            <span
              className="font-mono text-xs tracking-[0.18em] uppercase mb-1.5 block"
              style={{ color: "#0ED3CF" }}
            >
              {stage.number}
            </span>
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-tight">
              {stage.title}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: stage.color }}>
              {stage.tagline}
            </p>
          </div>
        </div>

        {/* Body card */}
        <motion.div
          className="rounded-xl border p-5 md:p-6 cursor-pointer group relative overflow-hidden"
          style={{
            backgroundColor: "#12110F",
            borderColor: expanded ? `${stage.color}50` : "#2A2826",
          }}
          whileHover={{ borderColor: `${stage.color}40` }}
          onClick={() => setExpanded((v) => !v)}
          transition={{ duration: 0.25 }}
          role="button"
          aria-expanded={expanded}
          aria-controls={`deliverables-${stage.id}`}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        >
          {/* Subtle corner glow */}
          <div
            className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle, ${stage.glowColor} 0%, transparent 70%)`,
            }}
          />

          {/* Body text + expand toggle */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-[15px] leading-relaxed text-muted-foreground flex-1">
              {stage.body}
            </p>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-shrink-0 mt-0.5"
            >
              <ChevronDownIcon
                className="w-5 h-5"
                style={{ color: expanded ? stage.color : "#7A7672" } as React.CSSProperties}
              />
            </motion.div>
          </div>

          {/* Deliverables panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                id={`deliverables-${stage.id}`}
                key="deliverables"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="mt-5 pt-5 border-t"
                  style={{ borderColor: `${stage.color}25` }}
                >
                  <p
                    className="font-mono text-[10px] tracking-[0.2em] uppercase mb-3"
                    style={{ color: stage.color }}
                  >
                    Deliverables
                  </p>
                  <ul className="space-y-2.5">
                    {stage.deliverables.map((item, i) => (
                      <motion.li
                        key={item}
                        className="flex items-start gap-3 text-sm"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.3, ease: "easeOut" }}
                      >
                        <span
                          className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${stage.color}18`, color: stage.color }}
                        >
                          <CheckIcon className="w-2.5 h-2.5" />
                        </span>
                        <span className="text-foreground/80 leading-relaxed">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Header section ─────────────────────────────────────── */
function TimelineHeader() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className="mb-20 md:mb-28"
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <p
        className="font-mono text-xs tracking-[0.22em] uppercase mb-5"
        style={{ color: "#0ED3CF" }}
      >
        How we work
      </p>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground text-balance leading-[1.08] mb-6">
        Four stages.
        <br />
        <span className="text-foreground/40">Zero surprises.</span>
      </h2>
      <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
        Every engagement follows the same transparent process — from first conversation
        to production deployment.
      </p>
    </motion.div>
  );
}

/* ─── CTA section ────────────────────────────────────────── */
function TimelineCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      className="mt-4 ml-14 md:ml-18"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      {/* Divider */}
      <div className="flex items-center gap-4 mb-10">
        <div className="h-px flex-1 bg-border" style={{ maxWidth: "3rem" }} />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Ready to start
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* CTA button */}
      <Link
        href="/how-it-works"
        className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        style={{
          backgroundColor: "#0ED3CF",
          color: "#09090B",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#12E8E4";
          e.currentTarget.style.boxShadow = "0 0 24px 4px rgba(14,211,207,0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#0ED3CF";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span className="font-semibold tracking-tight">See it in action</span>
        <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      <p className="mt-4 text-xs text-muted-foreground">
        No commitment. 30-minute intro call.
      </p>
    </motion.div>
  );
}

/* ─── Root component ─────────────────────────────────────── */
export default function ProcessTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 80%", "end 20%"],
  });

  const rawProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const lineProgress = useSpring(rawProgress, { stiffness: 60, damping: 30 });
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    return lineProgress.on("change", (v) => setProgressValue(v));
  }, [lineProgress]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen py-24 md:py-32 px-5 md:px-12 lg:px-20 noise-bg overflow-hidden"
      style={{ backgroundColor: "#09090B" }}
      aria-labelledby="process-heading"
    >
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #0ED3CF 0%, transparent 70%)",
          transform: "translate(-50%, -20%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #C7236E 0%, transparent 70%)",
          transform: "translate(50%, 20%)",
        }}
      />

      <div className="max-w-2xl mx-auto">
        <TimelineHeader />

        {/* Timeline body */}
        <div ref={timelineRef} className="relative">
          {/* Animated spine line */}
          <TimelineConnector progress={progressValue} />

          {/* Stage cards */}
          <div>
            {STAGES.map((stage, i) => (
              <StageCard key={stage.id} stage={stage} index={i} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <TimelineCTA />
      </div>
    </section>
  );
}

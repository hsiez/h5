"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="bg-(--color-neutral-200) text-(--color-text-primary) px-3 py-2 rounded-2xl max-w-[75%] text-sm leading-snug">
        {children}
      </div>
    </div>
  );
}

function AgentCard({
  tool,
  children,
}: {
  tool: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[260px]">
      <div className="bg-white border border-(--color-border) rounded-lg shadow-sm p-2.5 flex flex-col gap-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wide text-(--color-text-tertiary)">
          {tool}
        </div>
        {children}
      </div>
    </div>
  );
}

function StyleChip({
  selected = false,
  children,
}: {
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        selected
          ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-(--color-text-primary) text-white text-xs font-medium"
          : "inline-flex items-center px-2 py-0.5 rounded-full border border-(--color-border-strong) text-(--color-text-secondary) text-xs font-medium"
      }
    >
      {selected && <span aria-hidden>✓</span>}
      {children}
    </span>
  );
}

function DiscoveryTool() {
  return (
    <AgentCard tool="discovery_tool">
      <div className="text-sm text-(--color-text-primary)">
        What style are you after?
      </div>
      <div className="flex flex-wrap gap-1">
        <StyleChip selected>Bold</StyleChip>
        <StyleChip>Minimal</StyleChip>
        <StyleChip>Playful</StyleChip>
        <StyleChip>Corporate</StyleChip>
      </div>
    </AgentCard>
  );
}

function PlanTool() {
  const steps = [
    "Hero with headline + CTA",
    "Feature grid (3 columns)",
    "Testimonials",
    "Pricing table",
    "Footer",
  ];
  return (
    <AgentCard tool="plan_tool">
      <ul className="text-sm text-(--color-text-primary) flex flex-col gap-0.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-(--color-text-tertiary) font-mono text-xs tabular-nums pt-0.5">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </AgentCard>
  );
}

function PrototypeThumbnail() {
  return (
    <div className="max-w-[260px]">
      <div className="bg-white border border-(--color-border) rounded-lg overflow-hidden shadow-md">
        <div className="aspect-[16/10] bg-(--color-surface-muted) p-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="h-0.5 w-6 rounded-full bg-(--color-border-strong)" />
            <div className="flex gap-1">
              <div className="h-0.5 w-3 rounded-full bg-(--color-border)" />
              <div className="h-0.5 w-3 rounded-full bg-(--color-border)" />
              <div className="h-0.5 w-3 rounded-full bg-(--color-border)" />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <div className="h-1 w-16 rounded-full bg-(--color-border-strong)" />
            <div className="h-0.5 w-10 rounded-full bg-(--color-border)" />
            <div className="h-2.5 w-10 rounded bg-(--color-text-primary) mt-0.5" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="h-2.5 bg-white border border-(--color-border) rounded" />
            <div className="h-2.5 bg-white border border-(--color-border) rounded" />
            <div className="h-2.5 bg-white border border-(--color-border) rounded" />
          </div>
        </div>
      </div>
      <p className="text-xs text-(--color-text-secondary) px-1 pt-1.5">
        Here&apos;s your landing page.
      </p>
    </div>
  );
}

type TrunkStyle = "full" | "top-half" | "bottom-half" | "none";

function TreeCell({
  label,
  trunk = "full",
  branch = false,
  node = false,
  strong = false,
  labelSize = "text-base",
  minWidth = "min-w-[180px]",
}: {
  label?: string;
  trunk?: TrunkStyle;
  branch?: boolean;
  node?: boolean;
  strong?: boolean;
  labelSize?: string;
  minWidth?: string;
}) {
  const trunkPos =
    trunk === "full"
      ? "top-0 bottom-0"
      : trunk === "top-half"
        ? "top-0 h-1/2"
        : trunk === "bottom-half"
          ? "top-1/2 bottom-0"
          : "hidden";

  return (
    <div className={`relative h-full flex items-center pl-1 ${minWidth}`}>
      <div
        className={`absolute left-1 w-px bg-(--color-border-strong) ${trunkPos}`}
      />
      {branch && (
        <div className="absolute left-1 top-1/2 w-3 h-px bg-(--color-border-strong)" />
      )}
      {node && (
        <div className="absolute left-1 top-1/2 w-2 h-2 bg-(--color-text-primary) -translate-x-1/2 -translate-y-1/2" />
      )}
      {label && (
        <span
          className={`font-mono ${labelSize} pl-5 whitespace-nowrap ${
            strong
              ? "text-(--color-text-primary) font-medium"
              : "text-(--color-text-secondary)"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function TracesSlide() {
  return (
    <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 md:gap-x-8 w-full max-w-content">
      <TreeCell label="conversation trace" trunk="bottom-half" node strong />
      <div className="bg-(--color-surface-muted) rounded-t-lg pt-3 px-4" />

      <TreeCell trunk="full" />
      <div className="bg-(--color-surface-muted) py-1.5 px-4">
        <UserMessage>make a saas landing page</UserMessage>
      </div>

      <TreeCell label="Span 1 · Discovery Tool" trunk="full" branch />
      <div className="bg-(--color-surface-muted) py-1.5 px-4">
        <DiscoveryTool />
      </div>

      <TreeCell label="Span 2 · Plan Tool" trunk="full" branch />
      <div className="bg-(--color-surface-muted) py-1.5 px-4">
        <PlanTool />
      </div>

      <TreeCell trunk="full" />
      <div className="bg-(--color-surface-muted) py-1.5 px-4">
        <UserMessage>build it</UserMessage>
      </div>

      <TreeCell label="Span 3 · Coding Subagent" trunk="top-half" branch />
      <div className="bg-(--color-surface-muted) rounded-b-lg py-1.5 px-4 pb-3">
        <PrototypeThumbnail />
      </div>
    </div>
  );
}

type SpanRow = {
  label?: string;
  trunk: TrunkStyle;
  branch?: boolean;
  node?: boolean;
  strong?: boolean;
  score?: { value: string; tone: "success" | "warning" };
};

const SPAN_ROWS: SpanRow[] = [
  { label: "conversation trace", trunk: "bottom-half", node: true, strong: true },
  {
    label: "Span 1 · Discovery Tool",
    trunk: "full",
    branch: true,
    score: { value: "0.89", tone: "success" },
  },
  {
    label: "Span 2 · Plan Tool",
    trunk: "full",
    branch: true,
    score: { value: "0.74", tone: "warning" },
  },
  {
    label: "Span 3 · Coding Subagent",
    trunk: "top-half",
    branch: true,
    score: { value: "0.86", tone: "success" },
  },
];

function ScoreText({ value }: { value: string }) {
  return (
    <span className="text-lg font-medium font-mono text-(--color-text-secondary)">
      Score:{" "}
      <span className="text-(--color-text-primary)">{value}</span>
    </span>
  );
}

function WorkflowPill() {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-[8px] border-2 border-(--color-accent-500) text-(--color-accent-500) text-lg font-medium font-mono bg-(--color-accent-50)">
      turnEvalWorkflow()
    </span>
  );
}

function ChainArrow() {
  return (
    <svg
      width="22"
      height="11"
      viewBox="0 0 16 8"
      className="shrink-0 text-(--color-text-tertiary)"
      aria-hidden
    >
      <path
        d="M0 4 H13 M10 1 L13 4 L10 7"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TraceScoringSlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const showSpans = step >= 1;
  const showHealth = step >= 2;

  let spanIndex = 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col w-full">
        {SPAN_ROWS.map((row, i) => {
          const idx = row.score ? spanIndex++ : -1;
          const baseDelay = showSpans && !reduceMotion ? idx * 0.18 : 0;
          return (
            <div key={i} className="h-16 flex items-center gap-4">
              <TreeCell
                label={row.label}
                trunk={row.trunk}
                branch={row.branch}
                node={row.node}
                strong={row.strong}
                minWidth="min-w-[220px]"
              />
              {row.score && (
                <>
                  <motion.div
                    className="flex items-center gap-3"
                    initial={false}
                    animate={{
                      opacity: showSpans ? 1 : 0,
                      x: showSpans ? 0 : -6,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.35,
                      ease: EASE_OUT,
                      delay: baseDelay,
                    }}
                  >
                    <ChainArrow />
                    <WorkflowPill />
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-3"
                    initial={false}
                    animate={{
                      opacity: showSpans ? 1 : 0,
                      x: showSpans ? 0 : -6,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.35,
                      ease: EASE_OUT,
                      delay: baseDelay + (reduceMotion ? 0 : 0.2),
                    }}
                  >
                    <ChainArrow />
                    <ScoreText value={row.score.value} />
                  </motion.div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="min-h-[2.5em] flex justify-start">
        <AnimatePresence>
          {showHealth && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                ease: EASE_OUT,
                delay: reduceMotion ? 0 : 0.6,
              }}
              className="text-lg font-medium flex items-center gap-3"
            >
              <span className="text-(--color-text-secondary)">
                Conversation health:
              </span>
              <span className="px-3 py-1 rounded-[8px] border-2 border-(--color-success-500) text-(--color-success-500) bg-(--color-success-500)/10 font-mono">
                0.83
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

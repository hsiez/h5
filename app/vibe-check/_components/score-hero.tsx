"use client";

import {
  motion,
  motionValue,
  animate,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/vibe-check/types";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const VERDICT_STYLES: Record<Verdict, { label: string; className: string }> = {
  human: { label: "Low Anomaly", className: "bg-[#16a34a] text-white" },
  likely_human: {
    label: "Mostly Typical",
    className: "bg-[#d97706] text-white",
  },
  likely_bot: {
    label: "Suspicious",
    className: "bg-(--color-neutral-700) text-white",
  },
  bot: { label: "Automation Likely", className: "bg-[#dc2626] text-white" },
};

function ringColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 70) return "#d97706";
  if (score >= 40) return "var(--color-neutral-500)";
  return "#dc2626";
}

export function ScoreHero({
  score,
  verdict,
  progress,
}: {
  score: number | null;
  verdict: Verdict | null;
  progress: number;
}) {
  const prefersReduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (score === null || prefersReduced) return;
    const mv = motionValue(0);
    const unsub = mv.on("change", (v) => setDisplayed(Math.round(v)));
    const controls = animate(mv, score, {
      duration: 1.2,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [score, prefersReduced]);

  const isRunning = score === null;
  const displayProgress = isRunning ? progress : 1;
  const dashOffset = CIRCUMFERENCE * (1 - displayProgress);
  const color = score !== null ? ringColor(score) : "var(--color-accent-500)";
  const verdictStyle = verdict ? VERDICT_STYLES[verdict] : null;
  const displayedScore = prefersReduced && score !== null ? score : displayed;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-[160px] h-[160px]">
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full -rotate-90"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: dashOffset }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }
            }
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isRunning ? (
            <span className="text-2xl font-semibold text-(--color-text-tertiary)">
              {Math.round(progress * 100)}%
            </span>
          ) : (
            <span className="text-4xl font-semibold text-(--color-text-primary) tabular-nums">
              {displayedScore}
            </span>
          )}
        </div>
      </div>

      {verdictStyle && (
        <motion.span
          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${verdictStyle.className}`}
        >
          {verdictStyle.label}
        </motion.span>
      )}
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SignalResult } from "@/lib/vibe-check/types";

function dotColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function formatValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "—";
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number") return raw.toString();
  if (typeof raw === "string") return raw.length > 50 ? raw.slice(0, 50) + "..." : raw;
  if (Array.isArray(raw)) return raw.length === 0 ? "[]" : raw.join(", ");
  return JSON.stringify(raw).slice(0, 50);
}

export function SignalRow({
  name,
  result,
}: {
  name: string;
  result: SignalResult;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-baseline gap-3 py-2 border-b border-(--color-border-subtle) last:border-b-0"
    >
      <span
        className="shrink-0 w-2 h-2 rounded-full mt-1.5"
        style={{ backgroundColor: dotColor(result.score) }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-base text-(--color-text-secondary)">{name}</p>
        {result.detail && (
          <p className="text-sm text-(--color-text-tertiary) truncate">
            {result.detail}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-sm font-mono text-(--color-text-tertiary)">
          {formatValue(result.rawValue)}
        </span>
        <span className="text-base font-semibold tabular-nums text-(--color-text-primary) w-8 text-right">
          {result.score}
        </span>
      </div>
    </motion.div>
  );
}

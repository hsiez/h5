"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { LayerScore } from "@/lib/vibe-check/types";
import { automationSignals } from "@/lib/vibe-check/signals/automation";
import { fingerprintSignals } from "@/lib/vibe-check/signals/fingerprint";
import { behaviorSignals } from "@/lib/vibe-check/signals/behavior";
import { SignalRow } from "./signal-row";

function barColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

const signalNames = new Map(
  [...automationSignals, ...fingerprintSignals, ...behaviorSignals].map((s) => [
    s.id,
    s.name,
  ]),
);

export function LayerCard({ layer }: { layer: LayerScore | null }) {
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  if (!layer) return null;

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 p-6 text-left cursor-pointer hover:bg-(--color-surface-muted) transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-lg font-medium text-(--color-text-primary)">
            {layer.name}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-(--color-surface-muted) overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor(layer.score) }}
                initial={{ width: 0 }}
                animate={{ width: `${layer.score}%` }}
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }
                }
              />
            </div>
            <span className="text-base font-semibold tabular-nums text-(--color-text-primary) w-8 text-right">
              {layer.score}
            </span>
          </div>
        </div>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
          className="w-5 h-5 text-(--color-text-tertiary) shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }
            }
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-0 flex flex-col">
              {layer.signals.map((result) => (
                <SignalRow
                  key={result.id}
                  name={signalNames.get(result.id) ?? result.id}
                  result={result}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

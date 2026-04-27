"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useOrientation } from "./orientation";

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

const wins = [
  {
    title: "Reliability",
    body: "Our existing async-jobs vendor has been unreliable. We trialed Workflows for this project and it hit the mark — the eval pipeline ran cleanly throughout.",
  },
  {
    title: "Velocity",
    body: "Evals have to keep up with the product. The step primitive stays out of the way — you write a regular async function, wrap it in step(), and it's durable. Fast to ship, easy to undo.",
  },
  {
    title: "One vendor",
    body: "We're a Vercel shop. Keeping ops under one roof means simpler observability and less to maintain.",
  },
  {
    title: "Dev experience",
    body: "Seamless with the rest of our Vercel tooling. Local development in particular felt great — that was a hard requirement for the team when shopping for a new async-jobs vendor.",
  },
];

export const WINS_STEPS = wins.length;

export function WinsSlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const isPortrait = useOrientation() === "portrait";

  return (
    <div
      className={`grid gap-x-8 gap-y-8 ${
        isPortrait ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {wins.map((win, i) => {
        const revealed = step >= i;
        return (
          <div key={i} className="flex flex-col gap-3">
            <div className="text-sm font-medium uppercase tracking-wide text-(--color-text-tertiary)">
              {win.title}
            </div>
            <motion.p
              initial={false}
              animate={{
                opacity: revealed ? 1 : 0,
                y: revealed ? 0 : 4,
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.35,
                ease: EASE_OUT,
              }}
              className="text-base text-(--color-text-secondary) leading-relaxed"
            >
              {win.body}
            </motion.p>
          </div>
        );
      })}
    </div>
  );
}

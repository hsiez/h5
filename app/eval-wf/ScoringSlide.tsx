"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Bounds = { x: number; y: number; width: number; height: number };

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const PAD = 10;
const BUBBLE_RADIUS = 32 + PAD;
const WHOLE_RADIUS = 32;

function safeRadius(width: number, height: number, target: number) {
  return Math.min(target, width / 2, height / 2);
}

function relativeBounds(child: HTMLElement, parent: HTMLElement): Bounds {
  const c = child.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  return {
    x: c.left - p.left,
    y: c.top - p.top,
    width: c.width,
    height: c.height,
  };
}

const captions = [
  "A multi-turn conversation — user asks, agent calls tools + generates response, user follows up, again and again. How can we tell if it's going well?",
  "One approach is evaluating the whole conversation at once — but every new message means re-evaluating the entire history. This gets clunky when the history includes info on previous tool calls and sub agents.",
  "So we score each turn individually, then aggregate per-turn scores into an overall conversation health score.",
];

const conversation: { role: "user" | "agent"; text: string }[] = [
  { role: "user", text: "Build me a flashcard app for studying Spanish." },
  { role: "agent", text: "Here's the prototype." },
  { role: "user", text: "Can you make the cards flip with an animation?" },
  { role: "agent", text: "Updated — bigger cards, flip on tap." },
  { role: "user", text: "Looks great. Add a daily streak counter?" },
  { role: "agent", text: "Streak counter added with persistence." },
];

export function ScoringSlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [wholeBounds, setWholeBounds] = useState<Bounds | null>(null);
  const [agentBoundsList, setAgentBoundsList] = useState<Bounds[]>([]);

  const showWhole = step === 1;
  const showPerTurn = step >= 2;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const first = messageRefs.current[0];
      const last = messageRefs.current[messageRefs.current.length - 1];
      if (first && last) {
        const f = relativeBounds(first, container);
        const l = relativeBounds(last, container);
        setWholeBounds({
          x: 0,
          y: f.y,
          width: container.clientWidth,
          height: l.y + l.height - f.y,
        });
      }

      const agents: Bounds[] = [];
      messageRefs.current.forEach((el, i) => {
        if (el && conversation[i].role === "agent") {
          agents.push(relativeBounds(el, container));
        }
      });
      setAgentBoundsList(agents);
    };

    measure();
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    messageRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <div className="max-w-prose w-full h-20 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="text-sm md:text-base text-(--color-text-secondary) font-medium leading-relaxed"
          >
            {captions[step] ?? captions[0]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative w-full max-w-content overflow-hidden py-4 md:py-8 -mx-2 md:-mx-4 px-2 md:px-4">
        <div ref={containerRef} className="relative flex flex-col gap-3">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                ref={(el) => {
                  messageRefs.current[i] = el;
                }}
                className={
                  msg.role === "user"
                    ? "bg-(--color-neutral-100) text-(--color-text-primary) px-4 py-3 rounded-2xl max-w-[60%] text-sm leading-snug"
                    : "text-(--color-text-primary) py-3 max-w-[60%] text-sm leading-snug"
                }
              >
                {msg.text}
              </div>
            </div>
          ))}

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            aria-hidden
          >
            <g
              stroke="var(--color-accent-500)"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {wholeBounds && (
                <motion.rect
                  x={wholeBounds.x - PAD}
                  y={wholeBounds.y - PAD}
                  width={wholeBounds.width + PAD * 2}
                  height={wholeBounds.height + PAD * 2}
                  rx={WHOLE_RADIUS}
                  initial={false}
                  animate={{
                    pathLength: showWhole ? 1 : 0,
                    opacity: showWhole ? 1 : 0,
                  }}
                  transition={{
                    pathLength: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT },
                    opacity: { duration: 0.2, ease: EASE_OUT },
                  }}
                />
              )}

              {agentBoundsList.map((b, i) => (
                <motion.rect
                  key={`agent-${i}`}
                  x={b.x - PAD}
                  y={b.y - PAD}
                  width={b.width + PAD * 2}
                  height={b.height + PAD * 2}
                  rx={safeRadius(
                    b.width + PAD * 2,
                    b.height + PAD * 2,
                    BUBBLE_RADIUS,
                  )}
                  initial={false}
                  animate={{
                    pathLength: showPerTurn ? 1 : 0,
                    opacity: showPerTurn ? 1 : 0,
                  }}
                  transition={{
                    pathLength: {
                      duration: reduceMotion ? 0 : 0.5,
                      ease: EASE_OUT,
                      delay: showPerTurn && !reduceMotion ? i * 0.12 : 0,
                    },
                    opacity: { duration: 0.2, ease: EASE_OUT },
                  }}
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="mt-6 min-h-[2.5em] flex justify-end">
          <AnimatePresence>
            {showPerTurn && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  ease: EASE_OUT,
                  delay: reduceMotion ? 0 : 0.6,
                }}
                className="text-xs font-medium px-4 py-2 rounded-full border border-(--color-accent-500) text-(--color-accent-500) bg-(--color-background) flex items-center gap-2"
              >
                <span className="font-mono">Σ</span>
                <span>Conversation health: 0.87</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useOrientation } from "./orientation";

type Bounds = { x: number; y: number; width: number; height: number };

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PAD = 10;
const INNER_PAD = 2;
const THUMB_RADIUS = 16 + PAD;
const USER_RADIUS = 32 + PAD;
const USER_RADIUS_INNER = 32 + INNER_PAD;

const GREEN = "#16a34a";
const GRAY = "rgba(20,20,20,0.4)";

// SVG clamps rx/ry independently — keep corners circular when rect is tiny.
function safeRadius(width: number, height: number, target: number) {
  return Math.min(target, width / 2, height / 2);
}

const captions = [
  "This example shows a customer requesting a prototype. The orchestrator agent calls the coding agent that handles the creation of the proto.",
  "Initial grade: compare input against output — the ask vs. what the agent produced.",
  "The next message that comes in holds potential confirmation — or contradiction — of our initial scoring.",
  "Sometimes it's direct feedback — an explicit reaction we can score against.",
  "Sometimes it's unrelated — a brand-new ask. Implicit acceptance of the prior turn.",
  "Sometimes nothing lands at all. The sleep() expires and silence becomes the signal.",
  "When a follow-up does land, it doubles as feedback for this turn and the starting-point prompt for the next span eval.",
];

const DEFAULT_FOLLOWUP = "Now let's add a quiz mode.";

const FOLLOWUP_BY_STEP: Record<number, string> = {
  0: DEFAULT_FOLLOWUP,
  1: DEFAULT_FOLLOWUP,
  2: DEFAULT_FOLLOWUP,
  3: "This is nothing like what I asked for. Useless.",
  4: DEFAULT_FOLLOWUP,
  5: DEFAULT_FOLLOWUP,
  6: DEFAULT_FOLLOWUP,
};

function relativeBounds(child: HTMLElement, parent: HTMLElement): Bounds {
  const c = child.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  // Parent may be inside a CSS transform (the slide scaler). Divide by the
  // effective scale so SVG coordinates line up with targets.
  const scaleX = parent.offsetWidth ? p.width / parent.offsetWidth : 1;
  const scaleY = parent.offsetHeight ? p.height / parent.offsetHeight : 1;
  return {
    x: (c.left - p.left) / scaleX,
    y: (c.top - p.top) / scaleY,
    width: c.width / scaleX,
    height: c.height / scaleY,
  };
}

export function AnatomySlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const isPortrait = useOrientation() === "portrait";
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMsg1Ref = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const followupRef = useRef<HTMLDivElement>(null);
  const newThumbRef = useRef<HTMLDivElement>(null);

  const [userMsg, setUserMsg] = useState<Bounds | null>(null);
  const [thumb, setThumb] = useState<Bounds | null>(null);
  const [followup, setFollowup] = useState<Bounds | null>(null);
  const [newThumb, setNewThumb] = useState<Bounds | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number>(440);
  const [scrollOffset, setScrollOffset] = useState(0);

  const followupText = FOLLOWUP_BY_STEP[step] ?? DEFAULT_FOLLOWUP;
  const followupVisible = step >= 2;
  const isUnavailable = step === 5;
  const showNewTurn = step === 6;
  const showInitialOutlines = step >= 1 && step < 6;
  const showOuterFollowupOutline = step === 3 || step === 4 || step === 6;
  const showInnerFollowupOutline = step === 6;
  const showNewThumbOutline = step === 6;
  const outerColor =
    step === 3 || step === 6 ? GREEN : step === 4 ? GRAY : GREEN;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      if (userMsg1Ref.current)
        setUserMsg(relativeBounds(userMsg1Ref.current, container));
      if (thumbnailRef.current)
        setThumb(relativeBounds(thumbnailRef.current, container));
      if (followupRef.current)
        setFollowup(relativeBounds(followupRef.current, container));
      if (newThumbRef.current)
        setNewThumb(relativeBounds(newThumbRef.current, container));

      // Viewport sized to the pre-scroll content (up through the follow-up).
      // The next-turn content lives below and is revealed by translating up.
      if (followupRef.current) {
        const fup = relativeBounds(followupRef.current, container);
        const innerHeight = fup.y + fup.height + PAD;
        const vh = innerHeight + 64;
        setViewportHeight(vh);
        if (showNewTurn) {
          const overflow = container.scrollHeight - innerHeight;
          setScrollOffset(-Math.max(0, overflow));
        } else {
          setScrollOffset(0);
        }
      }
    };

    measure();
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    if (userMsg1Ref.current) ro.observe(userMsg1Ref.current);
    if (thumbnailRef.current) ro.observe(thumbnailRef.current);
    if (followupRef.current) ro.observe(followupRef.current);
    if (newThumbRef.current) ro.observe(newThumbRef.current);

    return () => ro.disconnect();
  }, [step, followupText, showNewTurn]);

  return (
    <div className={`flex flex-col ${isPortrait ? "gap-2" : "gap-4"}`}>
      <div className="max-w-prose w-full h-20 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={`${
              isPortrait ? "text-base" : "text-lg"
            } text-(--color-text-secondary) leading-relaxed`}
          >
            {captions[step] ?? captions[0]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div
        ref={viewportRef}
        className="relative w-full max-w-content overflow-hidden py-8 -mx-4 px-4"
        style={{
          height: viewportHeight,
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0, #000 32px, #000 calc(100% - 32px), transparent 100%)",
        }}
      >
        <motion.div
          ref={containerRef}
          initial={false}
          animate={{ y: scrollOffset }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE_OUT_EXPO }}
          className="relative flex flex-col gap-8"
        >
          <div className="flex justify-end">
            <div
              ref={userMsg1Ref}
              className="bg-(--color-neutral-200) text-(--color-text-primary) px-4 py-3 rounded-2xl max-w-[75%] text-base leading-snug"
            >
              Build me a flashcard app for studying Spanish.
            </div>
          </div>

          <div className="flex flex-col gap-5 max-w-xs">
            <div
              ref={thumbnailRef}
              className="bg-white border border-(--color-border) rounded-lg overflow-hidden shadow-md"
            >
              <div className="aspect-[16/10] bg-(--color-surface-muted) p-4 flex flex-col items-center justify-center gap-3">
                <div className="h-1 w-14 rounded-full bg-(--color-border-strong)" />
                <div className="w-28 aspect-[3/2] bg-white rounded-md border border-(--color-border-strong) shadow-sm flex flex-col items-center justify-center gap-1.5">
                  <div className="h-1.5 w-10 rounded-full bg-(--color-border-strong)" />
                  <div className="h-1 w-6 rounded-full bg-(--color-border)" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-4 w-10 rounded bg-(--color-text-primary)" />
                  <div className="h-4 w-10 rounded border border-(--color-border-strong)" />
                </div>
              </div>
            </div>
            <p className="text-base text-(--color-text-primary) px-1">
              Here is your prototype.
            </p>
          </div>

          <motion.div
            className="flex justify-end"
            initial={false}
            animate={{ opacity: followupVisible ? 1 : 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.35,
              ease: EASE_OUT,
            }}
          >
            <motion.div
              ref={followupRef}
              className="bg-(--color-neutral-200) text-(--color-text-primary) px-4 py-3 rounded-2xl max-w-[75%] text-base leading-snug"
              initial={false}
              animate={{
                backgroundImage: isUnavailable
                  ? "repeating-linear-gradient(-45deg, transparent 0 5px, rgba(20,20,20,0.14) 5px 6px)"
                  : "repeating-linear-gradient(-45deg, transparent 0 5px, rgba(20,20,20,0) 5px 6px)",
              }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={followupText}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isUnavailable ? 0.35 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="inline-block"
                >
                  {followupText}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <div className="flex flex-col gap-5 max-w-xs">
            <div
              ref={newThumbRef}
              className="bg-white border border-(--color-border) rounded-lg overflow-hidden shadow-md"
            >
              <div className="aspect-[16/10] bg-(--color-surface-muted) p-4 flex flex-col items-center justify-center gap-3">
                <div className="h-1 w-14 rounded-full bg-(--color-border-strong)" />
                <div className="w-36 aspect-[3/2] bg-white rounded-md border border-(--color-border-strong) shadow-sm flex flex-col items-center justify-center gap-1.5">
                  <div className="h-1.5 w-14 rounded-full bg-(--color-border-strong)" />
                  <div className="h-1 w-8 rounded-full bg-(--color-border)" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-4 w-10 rounded bg-(--color-text-primary)" />
                  <div className="h-4 w-10 rounded border border-(--color-border-strong)" />
                </div>
              </div>
            </div>
            <p className="text-base text-(--color-text-primary) px-1">
              Updated — quiz mode with multiple-choice prompts.
            </p>
          </div>

          {(thumb || userMsg || followup || newThumb) && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              aria-hidden
            >
              <g
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {thumb && (
                  <motion.rect
                    x={thumb.x - PAD}
                    y={thumb.y - PAD}
                    width={thumb.width + PAD * 2}
                    height={thumb.height + PAD * 2}
                    rx={safeRadius(
                      thumb.width + PAD * 2,
                      thumb.height + PAD * 2,
                      THUMB_RADIUS,
                    )}
                    stroke="var(--color-accent-500)"
                    initial={false}
                    animate={{
                      pathLength: showInitialOutlines ? 1 : 0,
                      opacity: showInitialOutlines ? 1 : 0,
                    }}
                    transition={{
                      pathLength: {
                        duration: reduceMotion ? 0 : 0.7,
                        ease: EASE_OUT,
                      },
                      opacity: { duration: 0.2, ease: EASE_OUT },
                    }}
                  />
                )}

                {userMsg && (
                  <motion.rect
                    x={userMsg.x - PAD}
                    y={userMsg.y - PAD}
                    width={userMsg.width + PAD * 2}
                    height={userMsg.height + PAD * 2}
                    rx={safeRadius(
                      userMsg.width + PAD * 2,
                      userMsg.height + PAD * 2,
                      USER_RADIUS,
                    )}
                    stroke="var(--color-accent-500)"
                    initial={false}
                    animate={{
                      pathLength: showInitialOutlines ? 1 : 0,
                      opacity: showInitialOutlines ? 1 : 0,
                    }}
                    transition={{
                      pathLength: {
                        duration: reduceMotion ? 0 : 0.6,
                        ease: EASE_OUT,
                        delay: showInitialOutlines && !reduceMotion ? 0.2 : 0,
                      },
                      opacity: { duration: 0.2, ease: EASE_OUT },
                    }}
                  />
                )}

                {followup && (
                  <motion.rect
                    x={followup.x - PAD}
                    y={followup.y - PAD}
                    width={followup.width + PAD * 2}
                    height={followup.height + PAD * 2}
                    rx={safeRadius(
                      followup.width + PAD * 2,
                      followup.height + PAD * 2,
                      USER_RADIUS,
                    )}
                    initial={false}
                    animate={{
                      pathLength: showOuterFollowupOutline ? 1 : 0,
                      opacity: showOuterFollowupOutline ? 1 : 0,
                      stroke: outerColor,
                    }}
                    transition={{
                      pathLength: {
                        duration: reduceMotion ? 0 : 0.6,
                        ease: EASE_OUT,
                        delay:
                          showOuterFollowupOutline && !reduceMotion ? 0.2 : 0,
                      },
                      opacity: { duration: 0.2, ease: EASE_OUT },
                      stroke: { duration: 0.4, ease: EASE_OUT },
                    }}
                  />
                )}

                {followup && (
                  <motion.rect
                    x={followup.x - INNER_PAD}
                    y={followup.y - INNER_PAD}
                    width={followup.width + INNER_PAD * 2}
                    height={followup.height + INNER_PAD * 2}
                    rx={safeRadius(
                      followup.width + INNER_PAD * 2,
                      followup.height + INNER_PAD * 2,
                      USER_RADIUS_INNER,
                    )}
                    stroke="var(--color-accent-500)"
                    initial={false}
                    animate={{
                      pathLength: showInnerFollowupOutline ? 1 : 0,
                      opacity: showInnerFollowupOutline ? 1 : 0,
                    }}
                    transition={{
                      pathLength: {
                        duration: reduceMotion ? 0 : 0.5,
                        ease: EASE_OUT,
                        delay:
                          showInnerFollowupOutline && !reduceMotion ? 0.5 : 0,
                      },
                      opacity: { duration: 0.2, ease: EASE_OUT },
                    }}
                  />
                )}

                {newThumb && (
                  <motion.rect
                    x={newThumb.x - PAD}
                    y={newThumb.y - PAD}
                    width={newThumb.width + PAD * 2}
                    height={newThumb.height + PAD * 2}
                    rx={safeRadius(
                      newThumb.width + PAD * 2,
                      newThumb.height + PAD * 2,
                      THUMB_RADIUS,
                    )}
                    stroke="var(--color-accent-500)"
                    initial={false}
                    animate={{
                      pathLength: showNewThumbOutline ? 1 : 0,
                      opacity: showNewThumbOutline ? 1 : 0,
                    }}
                    transition={{
                      pathLength: {
                        duration: reduceMotion ? 0 : 0.7,
                        ease: EASE_OUT,
                        delay: showNewThumbOutline && !reduceMotion ? 0.7 : 0,
                      },
                      opacity: { duration: 0.2, ease: EASE_OUT },
                    }}
                  />
                )}
              </g>
            </svg>
          )}
        </motion.div>
      </div>
    </div>
  );
}

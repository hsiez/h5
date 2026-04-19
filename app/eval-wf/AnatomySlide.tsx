"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Bounds = { x: number; y: number; width: number; height: number };

// Mirror of --ease-out / custom expo from globals.css. Centralized so every
// step transition draws from the same curve set instead of one-off arrays.
const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PAD = 10;
// Annotation rx = inner element's rx + PAD so the outline stays concentric.
const THUMB_RADIUS = 16 + PAD; // thumbnail uses rounded-lg (16px)
const USER_RADIUS = 32 + PAD; // user bubble uses rounded-2xl (32px)

// SVG clamps rx and ry independently — if rx exceeds half the rect's height,
// the corners go elliptical. Clamp to the smaller half-dimension so corners
// stay circular and match CSS border-radius behavior.
function safeRadius(width: number, height: number, target: number) {
  return Math.min(target, width / 2, height / 2);
}

const captions = [
  "This example shows a customer requesting a prototype. The orchestrator agent calls the coding agent that handles the creation of the proto.",
  "The orchestrator spent a turn calling the code agent to build this prototype. Now we evaluate how it did.",
  "Score the prototype against the user's request, the harness prompt, and tool + skill usage metrics.",
  "The follow-up is the real money — the clearest signal on how the user feels. Sometimes it's a brand-new ask, an implicit acceptance of the prior turn.",
  "Sometimes it's flat dissatisfaction — a clear miss signal.",
  "Sometimes it's both critique and instruction.",
  "Doubling as ground truth for the next turn — same shape, new eval cycle.",
];

const lastMessages = [
  "Can you make the cards flip with an animation?",
  "This is nothing like what I asked for. Useless.",
  "This sucks. <instructions on what to fix>",
];

function lastMessageIndex(step: number) {
  if (step >= 5) return 2;
  if (step >= 4) return 1;
  return 0;
}

function relativeBounds(child: HTMLElement, parent: HTMLElement): Bounds {
  const c = child.getBoundingClientRect();
  const p = parent.getBoundingClientRect();
  // Parent may be inside a CSS `transform: scale(...)` ancestor (the slide
  // scaler). `getBoundingClientRect` returns post-transform viewport px, but
  // the SVG we draw into is itself inside the same transform and uses
  // pre-transform (layout) px. Divide by the effective scale so outlines
  // align with targets at any zoom.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const userMsg1Ref = useRef<HTMLDivElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const userMsg2Ref = useRef<HTMLDivElement>(null);

  const [userMsg, setUserMsg] = useState<Bounds | null>(null);
  const [thumb, setThumb] = useState<Bounds | null>(null);
  const [lastUserMsg, setLastUserMsg] = useState<Bounds | null>(null);
  // Viewport height clips below the original 3 messages; new turn lives below
  // and is revealed by translating the inner content upward.
  const [viewportHeight, setViewportHeight] = useState<number>(440);
  const [scrollOffset, setScrollOffset] = useState(0);

  const lastIdx = lastMessageIndex(step);
  const showThumbOutline = step >= 1 && step < 6;
  const showUserOutline = step >= 2 && step < 6;
  const showLastOutline = step >= 3;
  const showNewTurn = step >= 6;
  const lastStrokeColor = step >= 6 ? "#16a34a" : "#eab308";

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      if (userMsg1Ref.current)
        setUserMsg(relativeBounds(userMsg1Ref.current, container));
      if (thumbnailRef.current)
        setThumb(relativeBounds(thumbnailRef.current, container));
      if (userMsg2Ref.current)
        setLastUserMsg(relativeBounds(userMsg2Ref.current, container));

      if (userMsg2Ref.current) {
        const last = relativeBounds(userMsg2Ref.current, container);
        // Inner content needs y..y+height+PAD; outer box adds px-8/py-8 (64 total).
        const innerHeight = last.y + last.height + PAD;
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
    // Webfont load shifts the user-bubble width — re-measure once fonts are ready.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    if (userMsg1Ref.current) ro.observe(userMsg1Ref.current);
    if (thumbnailRef.current) ro.observe(thumbnailRef.current);
    if (userMsg2Ref.current) ro.observe(userMsg2Ref.current);

    return () => ro.disconnect();
  }, [showNewTurn, lastIdx]);

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

      <div
        className="relative w-full max-w-content overflow-hidden py-8 -mx-2 md:-mx-4 px-2 md:px-4"
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
        className="relative flex flex-col gap-5"
      >
        <div className="flex justify-end">
          <div
            ref={userMsg1Ref}
            className="bg-(--color-neutral-100) text-(--color-text-primary) px-4 py-3 rounded-2xl max-w-[75%] text-sm leading-snug"
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
          <p className="text-sm text-(--color-text-primary) px-1">
            Here is your prototype.
          </p>
        </div>

        <div className="flex justify-end">
          <div
            ref={userMsg2Ref}
            className="bg-(--color-neutral-100) text-(--color-text-primary) px-4 py-3 rounded-2xl max-w-[75%] text-sm leading-snug"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={lastIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="inline-block"
              >
                {lastMessages[lastIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-5 max-w-xs">
          <div className="bg-white border border-(--color-border) rounded-lg overflow-hidden shadow-md">
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
          <p className="text-sm text-(--color-text-primary) px-1">
            Updated — bigger cards, contrast fixed, flip on tap.
          </p>
        </div>

        {(thumb || userMsg || lastUserMsg) && (
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
                  initial={false}
                  animate={{
                    pathLength: showThumbOutline ? 1 : 0,
                    opacity: showThumbOutline ? 1 : 0,
                  }}
                  transition={{
                    pathLength: { duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT },
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
                  stroke="var(--color-success-500)"
                  initial={false}
                  animate={{
                    pathLength: showUserOutline ? 1 : 0,
                    opacity: showUserOutline ? 1 : 0,
                  }}
                  transition={{
                    pathLength: {
                      duration: reduceMotion ? 0 : 0.6,
                      ease: EASE_OUT,
                      delay: showUserOutline && !reduceMotion ? 0.35 : 0,
                    },
                    opacity: { duration: 0.2, ease: EASE_OUT },
                  }}
                />
              )}

              {lastUserMsg && (
                <motion.rect
                  x={lastUserMsg.x - PAD}
                  y={lastUserMsg.y - PAD}
                  width={lastUserMsg.width + PAD * 2}
                  height={lastUserMsg.height + PAD * 2}
                  rx={safeRadius(
                    lastUserMsg.width + PAD * 2,
                    lastUserMsg.height + PAD * 2,
                    USER_RADIUS,
                  )}
                  initial={false}
                  animate={{
                    pathLength: showLastOutline ? 1 : 0,
                    opacity: showLastOutline ? 1 : 0,
                    stroke: lastStrokeColor,
                  }}
                  transition={{
                    pathLength: {
                      duration: reduceMotion ? 0 : 0.6,
                      ease: EASE_OUT,
                      delay: showLastOutline && !reduceMotion ? 0.35 : 0,
                    },
                    opacity: { duration: 0.2, ease: EASE_OUT },
                    stroke: { duration: 0.5, ease: EASE_OUT },
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

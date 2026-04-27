"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useOrientation } from "./orientation";

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const DEMO_STEPS = 2;

const captions = [
  "By default, eval results pile up in dashboards — endless, unwatched.",
  "With Workflows, feedback becomes a Slack alert, a synthetic-user story, and a Linear ticket.",
];

const BEFORE_VIDEO_SRC = "/demo-before.mp4";
const AFTER_VIDEO_SRC = "/demo-after.mp4";

function MediaFrame({
  label,
  reduceMotion,
  children,
}: {
  label: string;
  reduceMotion: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-(--color-surface-muted) border border-(--color-border) shadow-md">
      {reduceMotion ? (
        <div className="w-full h-full flex items-center justify-center text-sm text-(--color-text-tertiary)">
          {label}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function DemoSlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const isPortrait = useOrientation() === "portrait";
  const handedOff = step >= 1;
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = beforeVideoRef.current;
    if (!v) return;
    if (handedOff) {
      v.pause();
    } else {
      void v.play().catch(() => {});
    }
  }, [handedOff]);

  useEffect(() => {
    const v = afterVideoRef.current;
    if (!v) return;
    if (!handedOff) {
      v.pause();
      v.currentTime = 0;
      return;
    }
    const delay = reduceMotion ? 0 : 800;
    const t = setTimeout(() => {
      void v.play().catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [handedOff, reduceMotion]);

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-prose w-full h-12 flex items-start">
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

      <div className="relative w-full max-w-content aspect-[16/9]">
        <motion.div
          initial={false}
          animate={
            handedOff
              ? {
                  bottom: "6%",
                  right: "4%",
                  width: "22%",
                  height: "22%",
                  opacity: 0.6,
                }
              : {
                  bottom: "0%",
                  right: "0%",
                  width: "100%",
                  height: "100%",
                  opacity: 1,
                }
          }
          transition={{
            duration: reduceMotion ? 0 : 0.8,
            ease: EASE_OUT_EXPO,
          }}
          className="absolute z-10"
        >
          <MediaFrame
            label="Endless Braintrust scroll"
            reduceMotion={reduceMotion}
          >
            <video
              ref={beforeVideoRef}
              src={BEFORE_VIDEO_SRC}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              aria-label="Endless Braintrust scroll"
            />
          </MediaFrame>
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            opacity: handedOff ? 1 : 0,
            scale: handedOff ? 1 : 0.96,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            ease: EASE_OUT,
            delay: handedOff && !reduceMotion ? 0.25 : 0,
          }}
          className="absolute inset-0"
        >
          <MediaFrame
            label="Feedback → Slack → synthetic user → Linear ticket"
            reduceMotion={reduceMotion}
          >
            <video
              ref={afterVideoRef}
              src={AFTER_VIDEO_SRC}
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
              aria-label="Feedback → Slack → synthetic user → Linear ticket"
            />
          </MediaFrame>
        </motion.div>
      </div>
    </div>
  );
}

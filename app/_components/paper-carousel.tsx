"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "@/app/_components/expandable-text";

const CARD_WIDTH = 720;
const ELLIPSE_BINS = [12, 8, 4, 1, 4, 8, 12];
const MAX_VISIBLE = 1;
const CARD_HEIGHT = "calc(100dvh - 4rem)";

export function ScrollFade({ children, onScroll: onScrollProp, scrollRef: externalScrollRef }: { children: React.ReactNode; onScroll?: (scrollTop: number) => void; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef || internalScrollRef;
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);
  const onScrollRef = useRef(onScrollProp);
  onScrollRef.current = onScrollProp;

  useEffect(() => {
    const el = scrollRef.current;
    const topFade = topFadeRef.current;
    const bottomFade = bottomFadeRef.current;
    if (!el || !topFade || !bottomFade) return;

    const easeOut = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

    function setFade(fade: HTMLDivElement, show: boolean) {
      const duration = show ? "150ms" : "200ms";
      fade.style.transition = `opacity ${duration} ${easeOut}`;
      fade.style.opacity = show ? "1" : "0";
    }

    function update() {
      if (!el || !topFade || !bottomFade) return;
      setFade(topFade, el.scrollTop > 2);
      setFade(bottomFade, el.scrollTop + el.clientHeight < el.scrollHeight - 2);
      onScrollRef.current?.(el.scrollTop);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative flex-1 min-h-0" role="presentation">
      <div
        ref={topFadeRef}
        className="pointer-events-none absolute inset-x-0 top-0 h-16 z-10"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-surface-sunken) 0%, rgba(244,244,244,0.8) 30%, rgba(244,244,244,0.3) 60%, transparent 100%)",
          opacity: 0,
          willChange: "opacity",
        }}
      />
      <div
        ref={scrollRef}
        className="overflow-y-auto h-full"
        role="presentation"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <div
        ref={bottomFadeRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 z-10"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to top, var(--color-surface-sunken) 0%, rgba(244,244,244,0.8) 30%, rgba(244,244,244,0.3) 60%, transparent 100%)",
          opacity: 0,
          willChange: "opacity",
        }}
      />
    </div>
  );
}

export function SoundwaveButton({ audioSrc, active = true }: { audioSrc: string; active?: boolean }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ellipseRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef(false);

  const [playing, setPlaying] = useState(false);

  const animate = useCallback(() => {
    const analyser = analyserRef.current;
    const audio = audioRef.current;

    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      ellipseRefs.current.forEach((el, i) => {
        if (!el) return;
        const value = data[ELLIPSE_BINS[i]] / 255;
        const scale = 0.3 + value * 0.7;
        el.style.transform = `scaleY(${scale})`;
      });
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const resetEllipses = useCallback(() => {
    ellipseRefs.current.forEach((el) => {
      if (el) el.style.transform = "scaleY(1)";
    });
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.addEventListener("ended", () => {
        setPlaying(false);
        cancelAnimationFrame(rafRef.current);
        resetEllipses();
      });
    }

    const audio = audioRef.current;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }

    if (!connectedRef.current) {
      const source = ctxRef.current.createMediaElementSource(audio);
      const analyser = ctxRef.current.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyser.connect(ctxRef.current.destination);
      analyserRef.current = analyser;
      connectedRef.current = true;
    }

    if (audio.paused) {
      ctxRef.current.resume();
      audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(animate);
    } else {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      resetEllipses();
    }
  }, [audioSrc, animate, resetEllipses]);

  useEffect(() => {
    if (!active && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      resetEllipses();
    }
  }, [active, resetEllipses]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
    };
  }, []);


  return (
    <button
      ref={btnRef}
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause audio" : "Listen to paper summary"}
      className="relative inline-flex items-center justify-center text-sm cursor-pointer rounded-lg px-4 text-white hover:brightness-110 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
      style={{
        minWidth: 62,
        height: 44,
        background: "linear-gradient(to bottom, #323137, #201E25)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.10), 0 0 0 1px #4B4951, inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <span className="grid place-items-center" style={{ width: 38, height: 16 }}>
        <span className="col-start-1 row-start-1 leading-none transition-opacity" style={{ opacity: playing ? 0 : 1 }}>
          Listen
        </span>
        <svg viewBox="0 0 44 40" fill="currentColor" aria-hidden="true" className="col-start-1 row-start-1 w-6 h-4 leading-none transition-opacity" style={{ opacity: playing ? 1 : 0 }}>
          {[
            { cx: 4, rx: 1.5, ry: 6 },
            { cx: 10, rx: 2, ry: 12 },
            { cx: 16, rx: 2, ry: 17 },
            { cx: 22, rx: 2, ry: 19 },
            { cx: 28, rx: 2, ry: 17 },
            { cx: 34, rx: 2, ry: 12 },
            { cx: 40, rx: 1.5, ry: 6 },
          ].map((e, i) => (
            <ellipse
              key={i}
              ref={(el) => { ellipseRefs.current[i] = el; }}
              cx={e.cx}
              cy="20"
              rx={e.rx}
              ry={e.ry}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                willChange: playing ? "transform" : "auto",
              }}
            />
          ))}
        </svg>
      </span>
    </button>
  );
}

export const cardShadow =
  "0 4px 8px -2px rgba(20,20,20,0.06), 0 2px 4px -2px rgba(20,20,20,0.04), 0 0 0 1px rgba(20,20,20,0.04), inset 0 0 0 1px rgba(255,255,255,1)";

function CarouselCard({
  paper,
  date,
  active,
}: {
  paper: PaperResult;
  date: string;
  active: boolean;
}) {
  return (
    <article
      className="flex flex-col gap-6 p-10 rounded-lg bg-(--color-surface-sunken) overflow-hidden"
      style={{ boxShadow: cardShadow, height: CARD_HEIGHT }}
    >
      <div className="flex flex-col gap-4 max-w-prose" role="presentation">
        <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-snug line-clamp-2">
          {paper.title}
        </h2>
        <p className="font-serif text-sm text-(--color-text-tertiary)" aria-label="Authors">
          {paper.authors.slice(0, 4).join(", ")}
          {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
        </p>
      </div>
      <ScrollFade>
        <ExpandableText text={paper.script} expanded={true} glossary={paper.glossary} />
      </ScrollFade>
      <footer className="flex items-end gap-3">
        <a
          href={`https://arxiv.org/abs/${paper.arxivId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) underline transition-colors"
        >
          arXiv
        </a>
        {paper.githubRepo && (
          <a
            href={`https://github.com/${paper.githubRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) underline transition-colors"
          >
            GitHub
          </a>
        )}
        <div className="ml-auto">
          <SoundwaveButton audioSrc={`/api/papers/${date}/${paper.arxivId}/audio`} active={active} />
        </div>
      </footer>
    </article>
  );
}

function EndCard({ previousDate }: { previousDate: string | null }) {
  return (
    <article
      className="flex flex-col items-center justify-center gap-6 p-10 overflow-hidden"
      style={{ height: CARD_HEIGHT }}
    >
      <p className="font-serif text-base text-(--color-text-tertiary) text-center max-w-xs">
        You sharpened your sword today, <span className="whitespace-nowrap">good work!</span>
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/swordy-halftone.svg"
        alt="Sword"
        width={173}
        height={320}
        className="rounded-lg bg-white"
      />
      {previousDate && (
        <a
          href={`/papers/${previousDate}`}
          className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) underline transition-colors"
        >
          See previous research papers
        </a>
      )}
    </article>
  );
}

export function PaperCarousel({
  papers,
  date,
  previousDate,
  className,
}: {
  papers: PaperResult[];
  date: string;
  previousDate: string | null;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const shouldReduceMotion = useReducedMotion();

  const totalSlides = papers.length + 1;

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalSlides - 1, index));
      setDirection(clamped >= active ? 1 : -1);
      setActive(clamped);
    },
    [totalSlides, active],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        goTo(active - 1);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        goTo(active + 1);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  const hasPrev = active > 0;
  const hasNext = active < totalSlides - 1;
  const isOnEndCard = active === papers.length;

  return (
    <div className={className} role="region" aria-roledescription="carousel" aria-label="Research papers">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isOnEndCard
          ? "End of papers"
          : `Paper ${active + 1} of ${papers.length}: ${papers[active].title}`}
      </div>
      <div className="flex items-center gap-8">
        <div className="relative flex-1 order-2">
          <div className="invisible pointer-events-none" aria-hidden="true">
            {isOnEndCard ? <EndCard previousDate={previousDate} /> : <CarouselCard paper={papers[active]} date={date} active={true} />}
          </div>

          {[...papers.map((paper, i) => ({ key: paper.arxivId, i, type: "paper" as const, paper })),
            { key: "__end__", i: papers.length, type: "end" as const, paper: null },
          ].map(({ key, i, type, paper }) => {
            const stackPos = i - active;
            if (stackPos < -1 || stackPos > MAX_VISIBLE) return null;

            const isDealt = stackPos < 0;
            const isEntering = stackPos === 0 && direction === -1;
            const isExitingBelow = stackPos === MAX_VISIBLE;

            return (
              <motion.div
                key={key}
                initial={isEntering ? { x: 700, rotateZ: 4, opacity: 1, scale: 0.95, y: -20 } : false}
                animate={{
                  x: isDealt ? 700 : 0,
                  y: isDealt ? -20 : 0,
                  scale: isDealt ? 0.95 : 1,
                  rotateZ: isDealt ? 4 : 0,
                  opacity: isDealt || isExitingBelow ? 0 : 1,
                }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", duration: 0.5, bounce: 0.12 }
                }
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  zIndex: isEntering ? totalSlides + 20 : isDealt ? totalSlides + 10 : totalSlides - stackPos,
                  transformOrigin: "left center",
                  pointerEvents: stackPos === 0 ? "auto" : "none",
                }}
              >
                {type === "end" ? <EndCard previousDate={previousDate} /> : <CarouselCard paper={paper!} date={date} active={stackPos === 0} />}
              </motion.div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={hasPrev ? undefined : true}
          aria-label="Previous paper"
          className="shrink-0 w-8 h-14 -ml-8 inline-flex items-center justify-center rounded-full bg-white text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-all disabled:opacity-0 disabled:pointer-events-none order-1"
          style={{ boxShadow: cardShadow }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3L4 10l8 7M4 10h14" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={hasNext ? undefined : true}
          aria-label="Next paper"
          className="shrink-0 w-8 h-14 -mr-8 inline-flex items-center justify-center rounded-full bg-white text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-all disabled:opacity-0 disabled:pointer-events-none order-3"
          style={{ boxShadow: cardShadow }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3l8 7-8 7M16 10H2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

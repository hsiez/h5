"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "@/app/_components/expandable-text";

const CARD_WIDTH = 640;
const RING_R = 20;
const RING_CIRC = 2 * Math.PI * RING_R;
const ELLIPSE_BINS = [12, 8, 4, 1, 4, 8, 12];
const MAX_VISIBLE = 4;
const CARD_HEIGHT = 640;

export function ScrollFade({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);

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
    <div className="relative flex-1 min-h-0">
      <div
        ref={topFadeRef}
        className="pointer-events-none absolute inset-x-0 top-0 h-16 z-10"
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
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <div
        ref={bottomFadeRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 z-10"
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

export function SoundwaveButton({ audioSrc }: { audioSrc: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ellipseRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

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

    if (audio && ringRef.current && audio.duration) {
      const progress = audio.currentTime / audio.duration;
      ringRef.current.style.strokeDashoffset = `${RING_CIRC * (1 - progress)}`;
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
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!hover || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, [hover]);

  return (
    <>
      <div className="relative shrink-0">
        {/* Progress ring */}
        <svg
          className="absolute pointer-events-none"
          viewBox="0 0 44 44"
          style={{
            inset: -2,
            width: 44,
            height: 44,
            transform: "rotate(-90deg)",
            opacity: playing ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        >
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            stroke="rgba(20,20,20,0.08)"
            strokeWidth="2"
          />
          <circle
            ref={(el) => { ringRef.current = el; }}
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            stroke="var(--color-text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={RING_CIRC}
            style={{ willChange: "stroke-dashoffset" }}
          />
        </svg>

        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label={playing ? "Pause audio" : "Listen to paper summary"}
          className="inline-flex items-center justify-center text-(--color-text-primary) transition-colors cursor-pointer rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
        >
          <svg viewBox="0 0 44 40" fill="currentColor" aria-hidden="true" className="w-8 h-8">
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
        </button>
      </div>

      {hover && !playing && (
        <div
          className="fixed z-50 pointer-events-none whitespace-nowrap rounded-md bg-(--color-text-primary) text-(--color-text-on-accent) text-xs px-2 py-1 -translate-x-1/2 -translate-y-full hidden md:block"
          style={{ left: pos.x, top: pos.y }}
        >
          Listen
        </div>
      )}
    </>
  );
}

export const cardShadow =
  "0 4px 8px -2px rgba(20,20,20,0.06), 0 2px 4px -2px rgba(20,20,20,0.04), 0 0 0 1px rgba(20,20,20,0.04), inset 0 0 0 1px rgba(255,255,255,1)";

function CarouselCard({
  paper,
  date,
}: {
  paper: PaperResult;
  date: string;
}) {
  return (
    <div className="relative">
      <article
        className="flex flex-col gap-6 p-8 rounded-lg bg-(--color-surface-sunken) overflow-hidden"
        style={{ boxShadow: cardShadow, height: CARD_HEIGHT }}
      >
        <div className="flex flex-col gap-4 max-w-prose pr-12">
          <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-snug line-clamp-2">
            {paper.title}
          </h2>
          <p className="font-serif text-sm text-(--color-text-tertiary)">
            {paper.authors.slice(0, 4).join(", ")}
            {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
          </p>
        </div>
        <ScrollFade>
          <ExpandableText text={paper.script} expanded={true} glossary={paper.glossary} className="pr-16" />
        </ScrollFade>
        <footer className="flex items-center gap-3">
          <a
            href={`https://arxiv.org/abs/${paper.arxivId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors px-3 py-1.5 rounded-full bg-white/80"
          >
            arXiv
          </a>
          {paper.githubRepo && (
            <a
              href={`https://github.com/${paper.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors px-3 py-1.5 rounded-full bg-white/80"
            >
              GitHub
            </a>
          )}
        </footer>
      </article>
      <div className="absolute top-8 right-8">
        <SoundwaveButton
          audioSrc={`/api/papers/${date}/${paper.arxivId}/audio`}
        />
      </div>
    </div>
  );
}

export function PaperCarousel({
  papers,
  date,
  className,
}: {
  papers: PaperResult[];
  date: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const goTo = useCallback(
    (index: number) => {
      setActive(Math.max(0, Math.min(papers.length - 1, index)));
    },
    [papers.length],
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

  return (
    <div className={className}>
      <div className="relative w-full">
        <div className="invisible pointer-events-none" aria-hidden="true">
          <CarouselCard paper={papers[active]} date={date} />
        </div>

        {papers.map((paper, i) => {
          const stackPos = i - active;
          if (stackPos < -1 || stackPos >= MAX_VISIBLE) return null;

          const isDealt = stackPos < 0;

          return (
            <motion.div
              key={paper.arxivId}
              initial={false}
              animate={{
                x: isDealt ? 700 : stackPos * -16,
                y: isDealt ? -20 : stackPos * 6,
                scale: isDealt ? 0.95 : 1 - stackPos * 0.035,
                rotateZ: isDealt ? 4 : stackPos * -2,
                opacity: isDealt ? 0 : 1,
              }}
              drag={stackPos === 0 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (stackPos !== 0) return;
                if (info.offset.x > 100 || info.velocity.x > 500) {
                  goTo(active + 1);
                } else if (info.offset.x < -100 || info.velocity.x < -500) {
                  goTo(active - 1);
                }
              }}
              whileDrag={{ cursor: "grabbing" }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : isDealt
                    ? { type: "spring", duration: 0.5, bounce: 0.12 }
                    : { type: "spring", duration: 0.5, bounce: 0.12 }
              }
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: isDealt ? papers.length + 10 : papers.length - stackPos,
                transformOrigin: "left center",
                pointerEvents: stackPos === 0 ? "auto" : "none",
                cursor: stackPos === 0 ? "grab" : "default",
              }}
            >
              <CarouselCard paper={paper} date={date} />
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}

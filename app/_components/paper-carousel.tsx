"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "@/app/_components/expandable-text";

const CARD_WIDTH = 640;
const RING_R = 20;
const RING_CIRC = 2 * Math.PI * RING_R;
const ELLIPSE_BINS = [12, 8, 4, 1, 4, 8, 12];

function ScrollFade({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setCanScrollUp(el.scrollTop > 2);
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
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
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 z-10 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-surface-muted) 0%, rgba(250,250,250,0.8) 30%, rgba(250,250,250,0.3) 60%, transparent 100%)",
          opacity: canScrollUp ? 1 : 0,
        }}
      />
      <div
        ref={ref}
        className="overflow-y-auto"
        style={{ maxHeight: "40vh", scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 z-10 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to top, var(--color-surface-muted) 0%, rgba(250,250,250,0.8) 30%, rgba(250,250,250,0.3) 60%, transparent 100%)",
          opacity: canScrollDown ? 1 : 0,
        }}
      />
    </div>
  );
}

function SoundwaveButton({ audioSrc }: { audioSrc: string }) {
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
          className="inline-flex items-center justify-center text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors cursor-pointer rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
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
          className="fixed z-50 pointer-events-none whitespace-nowrap rounded-md bg-(--color-text-primary) text-(--color-text-on-accent) text-xs px-2 py-1 -translate-x-1/2 -translate-y-full"
          style={{ left: pos.x, top: pos.y }}
        >
          Listen
        </div>
      )}
    </>
  );
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const cardShadow =
  "0 4px 8px -2px rgba(20,20,20,0.06), 0 2px 4px -2px rgba(20,20,20,0.04), 0 0 0 1px rgba(20,20,20,0.04), inset 0 0 0 1px rgba(255,255,255,1)";

function CarouselCard({
  paper,
  date,
}: {
  paper: PaperResult;
  date: string;
}) {
  return (
    <article
      className="flex flex-col gap-6 p-8 rounded-lg bg-(--color-surface-muted) overflow-hidden"
      style={{ boxShadow: cardShadow }}
    >
      <div className="flex flex-col gap-2 max-w-prose">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-relaxed text-pretty">
            {paper.title}
          </h2>
          <SoundwaveButton
            audioSrc={`/api/papers/${date}/${paper.arxivId}/audio`}
          />
        </div>
        <p className="font-serif text-sm text-(--color-text-tertiary)">
          {paper.authors.slice(0, 4).join(", ")}
          {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
        </p>
      </div>
      <ScrollFade>
        <ExpandableText text={paper.abstract} expanded={true} className="pr-16" />
      </ScrollFade>
    </article>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;
    const scrollLeft =
      child.offsetLeft - el.offsetWidth / 2 + child.offsetWidth / 2;
    el.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(papers.length - 1, index));
      setActive(clamped);
      scrollTo(clamped);
    },
    [papers.length, scrollTo],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      if (!el) return;
      const center = el.scrollLeft + el.offsetWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(center - childCenter);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setActive(closest);
    }

    el.addEventListener("scrollend", onScroll);
    return () => {
      el.removeEventListener("scrollend", onScroll);
    };
  }, []);

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
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-(--color-background) to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-(--color-background) to-transparent" />
        <div
          ref={scrollRef}
          className="flex gap-14 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            paddingInline: `calc(50% - ${CARD_WIDTH / 2}px)`,
          }}
        >
          {papers.map((paper) => (
            <div
              key={paper.arxivId}
              className="snap-center shrink-0"
              style={{ width: `min(100%, ${CARD_WIDTH}px)` }}
            >
              <CarouselCard paper={paper} date={date} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous paper"
          className="icon rounded-full text-(--color-text-tertiary) hover:text-(--color-text-primary) disabled:opacity-30 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
        >
          <ArrowLeft />
        </button>

        <div className="flex items-center gap-2">
          {papers.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to paper ${i + 1}`}
              className="h-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
              style={{
                width: i === active ? 24 : 8,
                backgroundColor: i === active
                  ? "var(--color-text-primary)"
                  : "rgba(20,20,20,0.16)",
                transition: "width 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 200ms ease",
                willChange: "width",
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === papers.length - 1}
          aria-label="Next paper"
          className="icon rounded-full text-(--color-text-tertiary) hover:text-(--color-text-primary) disabled:opacity-30 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

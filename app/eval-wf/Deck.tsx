"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { slides } from "./slides";

const CANVAS_W = 1280;
const CANVAS_H = 720;

function SlideScaler({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setScale(Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="h-full w-full flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Deck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  // Reset step state any time the active slide changes (scroll, dot click,
  // hash nav, or step-overflow advance).
  useEffect(() => {
    setStepIndex(0);
  }, [current]);

  const goTo = useCallback(
    (idx: number) => {
      const target = Math.max(0, Math.min(slides.length - 1, idx));
      slideRefs.current[target]?.scrollIntoView({ behavior: "smooth" });
    },
    [slides.length],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.intersectionRatio <= bestRatio) continue;
          const idx = slideRefs.current.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;
          bestRatio = entry.intersectionRatio;
          bestIdx = idx;
        }
        if (bestIdx >= 0 && bestRatio > 0.5) {
          setCurrent(bestIdx);
          const id = slides[bestIdx].id;
          if (window.location.hash !== `#${id}`) {
            history.replaceState(null, "", `#${id}`);
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75], root },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const idx = slides.findIndex((s) => s.id === hash);
    if (idx >= 0) {
      slideRefs.current[idx]?.scrollIntoView({ behavior: "auto" });
    }
  }, [slides]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const next = ["ArrowDown", "ArrowRight", "PageDown", " ", "j"];
      const prev = ["ArrowUp", "ArrowLeft", "PageUp", "k"];

      const totalSteps = slides[current]?.steps ?? 1;

      if (next.includes(e.key)) {
        e.preventDefault();
        if (stepIndex < totalSteps - 1) {
          setStepIndex((s) => s + 1);
        } else {
          goTo(current + 1);
        }
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        if (stepIndex > 0) {
          setStepIndex((s) => s - 1);
        } else {
          goTo(current - 1);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, stepIndex, goTo, slides]);

  return (
    <div className="relative h-svh w-full overflow-hidden bg-(--color-background)">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory"
      >
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            id={slide.id}
            className="snap-start h-svh w-full overflow-hidden"
          >
            <SlideScaler>
              <div className="h-full w-full px-16 py-10 flex items-center justify-center">
                <div className="w-full max-w-content flex flex-col gap-8">
                  <h2 className="text-4xl font-semibold tracking-tight text-(--color-text-primary) text-balance">
                    {slide.title}
                  </h2>
                  <div className="text-base text-(--color-text-secondary) leading-relaxed">
                    {typeof slide.body === "function"
                      ? slide.body(i === current ? stepIndex : 0)
                      : slide.body}
                  </div>
                </div>
              </div>
            </SlideScaler>
          </section>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-6 left-6 text-xs font-medium tracking-wide text-(--color-text-tertiary) select-none">
        Reforge Build Acq. by Miro · Vercel Workflows
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 text-xs font-mono tabular-nums text-(--color-text-tertiary) select-none">
        {String(current + 1).padStart(2, "0")} <span className="text-(--color-border-strong)">/</span>{" "}
        {String(slides.length).padStart(2, "0")}
      </div>

      <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col items-end gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? "true" : undefined}
            className={`block h-1.5 rounded-full transition-all duration-300 ease-out ${
              i === current
                ? "w-6 bg-(--color-text-primary)"
                : "w-1.5 bg-(--color-border-strong) hover:bg-(--color-text-tertiary)"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { slides } from "./slides";
import { CANVAS, OrientationContext, type Orientation } from "./orientation";

function SlideScaler({
  orientation,
  children,
}: {
  orientation: Orientation;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { w, h } = CANVAS[orientation];

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setScale(Math.min(rect.width / w, rect.height / h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  return (
    <div
      ref={frameRef}
      className="h-full w-full flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          width: w,
          height: h,
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

function useOrientationDetector(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>("landscape");

  useEffect(() => {
    const mq = window.matchMedia(
      "(orientation: portrait) and (max-width: 768px)",
    );
    const update = () => setOrientation(mq.matches ? "portrait" : "landscape");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return orientation;
}

type Stop = { slideIdx: number; stepIdx: number };

export function Deck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const orientation = useOrientationDetector();

  const stops = useMemo<Stop[]>(
    () =>
      slides.flatMap((slide, slideIdx) => {
        const count = slide.steps ?? 1;
        return Array.from({ length: count }, (_, stepIdx) => ({
          slideIdx,
          stepIdx,
        }));
      }),
    [],
  );

  const slideStartStop = useMemo(() => {
    const map: number[] = [];
    let acc = 0;
    for (const slide of slides) {
      map.push(acc);
      acc += slide.steps ?? 1;
    }
    return map;
  }, []);

  const goToSlide = useCallback(
    (idx: number) => {
      const slideIdx = Math.max(0, Math.min(slides.length - 1, idx));
      const stopIdx = slideStartStop[slideIdx];
      stopRefs.current[stopIdx]?.scrollIntoView({ behavior: "smooth" });
    },
    [slideStartStop],
  );

  const goToStop = useCallback((stopIdx: number) => {
    const target = Math.max(0, Math.min(stopRefs.current.length - 1, stopIdx));
    stopRefs.current[target]?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.intersectionRatio <= bestRatio) continue;
          const idx = stopRefs.current.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;
          bestRatio = entry.intersectionRatio;
          bestIdx = idx;
        }
        if (bestIdx >= 0 && bestRatio > 0.5) {
          const { slideIdx, stepIdx } = stops[bestIdx];
          setCurrent(slideIdx);
          setStepIndex(stepIdx);
          const id = slides[slideIdx].id;
          if (window.location.hash !== `#${id}`) {
            history.replaceState(null, "", `#${id}`);
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75], root },
    );
    stopRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [stops]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const idx = slides.findIndex((s) => s.id === hash);
    if (idx >= 0) {
      const stopIdx = slideStartStop[idx];
      stopRefs.current[stopIdx]?.scrollIntoView({ behavior: "auto" });
    }
  }, [slideStartStop]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const next = ["ArrowDown", "ArrowRight", "PageDown", " ", "j"];
      const prev = ["ArrowUp", "ArrowLeft", "PageUp", "k"];

      const currentStopIdx = stops.findIndex(
        (s) => s.slideIdx === current && s.stepIdx === stepIndex,
      );

      if (next.includes(e.key)) {
        e.preventDefault();
        goToStop(currentStopIdx + 1);
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        goToStop(currentStopIdx - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToStop(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToStop(stopRefs.current.length - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, stepIndex, stops, goToStop]);

  const isPortrait = orientation === "portrait";

  return (
    <OrientationContext.Provider value={orientation}>
    <div className="relative h-svh w-full overflow-hidden bg-(--color-background)">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory"
      >
        {slides.map((slide, slideIdx) => {
          const stepCount = slide.steps ?? 1;
          const activeStep = slideIdx === current ? stepIndex : 0;
          return (
            <div
              key={slide.id}
              className="relative w-full"
              style={{ height: `calc(${stepCount} * 100svh)` }}
            >
              <div
                id={slide.id}
                className="sticky top-0 h-svh w-full overflow-hidden"
              >
                <SlideScaler orientation={orientation}>
                  <div
                    className={`h-full w-full flex items-center justify-center ${
                      isPortrait ? "px-8 py-12" : "px-16 py-10"
                    }`}
                  >
                    <div
                      className={`w-full max-w-content flex flex-col ${
                        isPortrait ? "gap-6" : "gap-8"
                      }`}
                    >
                      {slide.title && (
                        <h2
                          className={`font-semibold tracking-tight text-(--color-text-primary) text-balance ${
                            isPortrait ? "text-3xl" : "text-4xl"
                          }`}
                        >
                          {slide.title}
                        </h2>
                      )}
                      <div
                        className={`text-(--color-text-secondary) leading-relaxed ${
                          isPortrait ? "text-base" : "text-lg"
                        }`}
                      >
                        {typeof slide.body === "function"
                          ? slide.body(activeStep)
                          : slide.body}
                      </div>
                    </div>
                  </div>
                </SlideScaler>
              </div>
              {Array.from({ length: stepCount }, (_, stepIdx) => {
                const flatIdx = slideStartStop[slideIdx] + stepIdx;
                return (
                  <div
                    key={stepIdx}
                    ref={(el) => {
                      stopRefs.current[flatIdx] = el;
                    }}
                    aria-hidden
                    className="absolute left-0 w-full h-svh snap-start pointer-events-none"
                    style={{ top: `calc(${stepIdx} * 100svh)` }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <a
        href="https://h5.codes/eval-wf"
        className="fixed bottom-4 left-4 text-sm font-mono tracking-wide text-(--color-text-tertiary)/70 hover:text-(--color-text-tertiary) transition-colors"
      >
        h5.codes/eval-wf
      </a>

      <div className="pointer-events-none fixed bottom-4 right-4 text-sm font-mono tabular-nums text-(--color-text-tertiary)/70 select-none">
        {String(current + 1).padStart(2, "0")} <span className="text-(--color-border-strong)">/</span>{" "}
        {String(slides.length).padStart(2, "0")}
      </div>

      <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col items-end gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goToSlide(i)}
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
    </OrientationContext.Provider>
  );
}

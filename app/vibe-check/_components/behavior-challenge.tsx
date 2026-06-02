"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LayerScore } from "@/lib/vibe-check/types";
import {
  type BehaviorMetrics,
  scoreBehavior,
} from "@/lib/vibe-check/signals/behavior";

interface Point {
  x: number;
  y: number;
  t: number;
}

interface RatioPoint {
  x: number;
  y: number;
}

const START: RatioPoint = { x: 0.14, y: 0.72 };
const GATES: RatioPoint[] = [
  { x: 0.34, y: 0.42 },
  { x: 0.56, y: 0.66 },
  { x: 0.78, y: 0.34 },
];
const HOLD_MS = 900;
const GATE_RADIUS = 26;
const HOLD_RADIUS = 30;
const CORRIDOR_TOLERANCE = 54;

export function BehaviorChallenge({
  disabled,
  onComplete,
  onProgress,
}: {
  disabled: boolean;
  onComplete: (layer: LayerScore) => void;
  onProgress: (progress: number) => void;
}) {
  const prefersReduced = useReducedMotion();
  const areaRef = useRef<HTMLDivElement>(null);
  const loadTimeRef = useRef(0);
  const dragStartRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const samplesRef = useRef<Point[]>([]);
  const holdSamplesRef = useRef<Point[]>([]);
  const pointerTypeRef = useRef("unknown");
  const draggingRef = useRef(false);
  const gateIndexRef = useRef(0);
  const boundaryViolationsRef = useRef(0);
  const [phase, setPhase] = useState<"ready" | "dragging" | "holding" | "missed" | "done">(
    "ready",
  );
  const [marker, setMarker] = useState(START);
  const [gateIndex, setGateIndex] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    loadTimeRef.current = performance.now();
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  function toPoint(event: React.PointerEvent): Point | null {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    return { x, y, t: performance.now() };
  }

  function pointToRatio(point: Point): RatioPoint {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return START;
    return {
      x: point.x / rect.width,
      y: point.y / rect.height,
    };
  }

  function ratioToPoint(ratio: RatioPoint | undefined): Point | null {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || !ratio) return null;
    return {
      x: rect.width * ratio.x,
      y: rect.height * ratio.y,
      t: performance.now(),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || phase === "done") return;
    const point = toPoint(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    resetHold();
    dragStartRef.current = point.t;
    samplesRef.current = [point];
    holdSamplesRef.current = [];
    pointerTypeRef.current = event.pointerType || "unknown";
    draggingRef.current = true;
    gateIndexRef.current = 0;
    boundaryViolationsRef.current = 0;
    setGateIndex(0);
    setPhase("dragging");
    setMarker(pointToRatio(point));
    onProgress(0.05);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    const point = toPoint(event);
    if (!point) return;

    samplesRef.current.push(point);
    setMarker(pointToRatio(point));

    const finalGate = ratioToPoint(GATES[GATES.length - 1]);
    const currentGate = ratioToPoint(GATES[gateIndexRef.current]);
    if (!finalGate) return;

    if (!isWithinCorridor(point)) {
      boundaryViolationsRef.current++;
    }

    if (currentGate && distance(point, currentGate) <= GATE_RADIUS) {
      const nextGate = Math.min(gateIndexRef.current + 1, GATES.length);
      gateIndexRef.current = nextGate;
      setGateIndex(nextGate);
    }

    if (gateIndexRef.current >= GATES.length && distance(point, finalGate) <= HOLD_RADIUS) {
      if (holdStartRef.current === null) {
        holdStartRef.current = point.t;
        holdSamplesRef.current = [point];
        setPhase("holding");
        startHoldTimer();
      } else {
        holdSamplesRef.current.push(point);
      }
    } else {
      resetHold();
      setPhase("dragging");
    }

    onProgress(progressFromState(point, finalGate));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const point = toPoint(event);
    if (!point) return;

    samplesRef.current.push(point);
    setMarker(pointToRatio(point));
    finishInteraction(point);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled || phase === "done") return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    const now = performance.now();
    const metrics: BehaviorMetrics = {
      completed: true,
      pointerType: "keyboard",
      durationMs: 2200,
      startDelayMs: now - loadTimeRef.current,
      sampleCount: 0,
      pathLength: 0,
      straightDistance: 0,
      pathRatio: 0,
      meanSpeed: 0,
      speedVariation: 0,
      targetDistance: 0,
      gatesPassed: GATES.length,
      totalGates: GATES.length,
      boundaryViolations: 0,
      holdDurationMs: HOLD_MS,
      holdSampleCount: 0,
      holdDrift: 0,
    };

    resetHold();
    setPhase("done");
    setGateIndex(GATES.length);
    setMarker(GATES[GATES.length - 1]);
    setHoldProgress(1);
    onProgress(1);
    onComplete(scoreBehavior(metrics));
  }

  function finishInteraction(point: Point) {
    const finalGate = ratioToPoint(GATES[GATES.length - 1]);
    if (!finalGate) return;

    const holdDurationMs =
      holdStartRef.current === null ? 0 : Math.max(0, point.t - holdStartRef.current);
    const completed =
      gateIndexRef.current >= GATES.length &&
      holdDurationMs >= HOLD_MS &&
      distance(point, finalGate) <= HOLD_RADIUS;

    const metrics = buildMetrics(
      samplesRef.current,
      finalGate,
      pointerTypeRef.current,
      dragStartRef.current - loadTimeRef.current,
      {
        completed,
        gatesPassed: Math.min(gateIndexRef.current, GATES.length),
        boundaryViolations: boundaryViolationsRef.current,
        holdDurationMs,
        holdSamples: holdSamplesRef.current,
      },
    );

    resetHold();

    if (!metrics.completed) {
      setPhase("missed");
      onProgress(0);
      return;
    }

    setPhase("done");
    setHoldProgress(1);
    onProgress(1);
    onComplete(scoreBehavior(metrics));
  }

  function isWithinCorridor(point: Point): boolean {
    const route = [START, ...GATES].map((ratio) => ratioToPoint(ratio));
    if (route.some((routePoint) => routePoint === null)) return true;
    const points = route as Point[];

    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = 1; i < points.length; i++) {
      minDistance = Math.min(
        minDistance,
        distanceToSegment(point, points[i - 1], points[i]),
      );
    }
    return minDistance <= CORRIDOR_TOLERANCE;
  }

  function startHoldTimer() {
    if (holdTimerRef.current !== null) return;
    holdTimerRef.current = window.setInterval(() => {
      const startedAt = holdStartRef.current;
      if (startedAt === null) return;
      const elapsed = performance.now() - startedAt;
      setHoldProgress(Math.min(1, elapsed / HOLD_MS));
    }, 50);
  }

  function resetHold() {
    holdStartRef.current = null;
    setHoldProgress(0);
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function progressFromState(point: Point, finalGate: Point): number {
    const gateProgress = gateIndexRef.current / GATES.length;
    const distanceProgress =
      gateIndexRef.current >= GATES.length
        ? 1
        : Math.max(0, 1 - distance(point, finalGate) / pathStraightDistance());
    return Math.min(
      0.98,
      0.1 + gateProgress * 0.62 + distanceProgress * 0.12 + holdProgress * 0.16,
    );
  }

  function pathStraightDistance(): number {
    const start = ratioToPoint(START);
    const finalGate = ratioToPoint(GATES[GATES.length - 1]);
    if (!start || !finalGate) return 1;
    return Math.max(1, distance(start, finalGate));
  }

  const statusText =
    phase === "done"
      ? "Interaction captured"
      : phase === "missed"
        ? "Path incomplete"
        : phase === "holding"
          ? "Hold steady"
          : disabled
            ? "Waiting for browser checks"
            : "Drag through the rings, then hold";

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-medium text-(--color-text-primary)">
              Interaction Pattern
            </p>
            <p className="mt-1 text-sm text-(--color-text-tertiary)">
              {statusText}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-(--color-surface-muted) px-3 py-1 text-sm font-medium text-(--color-text-secondary)">
            Layer 4
          </span>
        </div>

        <div
          ref={areaRef}
          data-vibe-challenge-area
          className="relative h-[220px] overflow-hidden rounded-md border border-(--color-border-subtle) bg-(--color-background) touch-none select-none"
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              points={[START, ...GATES]
                .map((point) => `${point.x * 100},${point.y * 100}`)
                .join(" ")}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {GATES.map((gate, index) => {
            const passed = gateIndex > index;
            const final = index === GATES.length - 1;
            return (
              <div
                key={`${gate.x}-${gate.y}`}
                data-vibe-challenge-gate={index}
                className={`absolute rounded-full border-2 ${
                  passed
                    ? "border-[#16a34a] bg-[#16a34a]/15"
                    : "border-(--color-border) bg-(--color-surface-muted)"
                }`}
                style={{
                  width: final ? 58 : 48,
                  height: final ? 58 : 48,
                  left: `calc(${gate.x * 100}% - ${final ? 29 : 24}px)`,
                  top: `calc(${gate.y * 100}% - ${final ? 29 : 24}px)`,
                }}
              >
                {final && (
                  <div
                    className="absolute inset-1 rounded-full bg-[#16a34a]/20"
                    style={{ transform: `scale(${holdProgress})` }}
                  />
                )}
              </div>
            );
          })}

          <motion.button
            type="button"
            aria-label="Drag marker through rings and hold"
            data-vibe-challenge-marker
            disabled={disabled || phase === "done"}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
            onPointerCancel={() => {
              if (draggingRef.current) {
                draggingRef.current = false;
                resetHold();
                setPhase("ready");
                setMarker(START);
                onProgress(0);
              }
            }}
            className="absolute h-10 w-10 rounded-full border border-(--color-border) bg-(--color-text-primary) shadow-sm cursor-grab disabled:cursor-default active:cursor-grabbing"
            style={{
              left: `calc(${marker.x * 100}% - 20px)`,
              top: `calc(${marker.y * 100}% - 20px)`,
            }}
            animate={
              phase === "missed" && !prefersReduced
                ? { scale: [1, 0.92, 1] }
                : { scale: 1 }
            }
            transition={{ duration: prefersReduced ? 0 : 0.18 }}
          />
        </div>
      </div>
    </div>
  );
}

function buildMetrics(
  samples: Point[],
  target: Point,
  pointerType: string,
  startDelayMs: number,
  extra: {
    completed: boolean;
    gatesPassed: number;
    boundaryViolations: number;
    holdDurationMs: number;
    holdSamples: Point[];
  },
): BehaviorMetrics {
  const first = samples[0] ?? target;
  const last = samples[samples.length - 1] ?? first;
  const pathLength = pathDistance(samples);
  const straightDistance = distance(first, last);
  const targetDistance = distance(last, target);
  const durationMs = Math.max(0, last.t - first.t);
  const speeds = segmentSpeeds(samples);
  const meanSpeed =
    speeds.length > 0
      ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
      : 0;
  const speedStdDev =
    speeds.length > 0
      ? Math.sqrt(
          speeds.reduce(
            (sum, speed) => sum + Math.pow(speed - meanSpeed, 2),
            0,
          ) / speeds.length,
        )
      : 0;
  const holdDrift = averageDistance(extra.holdSamples, target);

  return {
    completed: extra.completed,
    pointerType,
    durationMs,
    startDelayMs,
    sampleCount: samples.length,
    pathLength,
    straightDistance,
    pathRatio:
      straightDistance > 0 ? pathLength / straightDistance : Number.POSITIVE_INFINITY,
    meanSpeed,
    speedVariation: meanSpeed > 0 ? speedStdDev / meanSpeed : 0,
    targetDistance,
    gatesPassed: extra.gatesPassed,
    totalGates: GATES.length,
    boundaryViolations: extra.boundaryViolations,
    holdDurationMs: extra.holdDurationMs,
    holdSampleCount: extra.holdSamples.length,
    holdDrift,
  };
}

function pathDistance(samples: Point[]): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += distance(samples[i - 1], samples[i]);
  }
  return total;
}

function segmentSpeeds(samples: Point[]): number[] {
  const speeds: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt > 0) speeds.push((distance(samples[i - 1], samples[i]) / dt) * 1000);
  }
  return speeds;
}

function averageDistance(samples: Point[], target: Point): number {
  if (samples.length === 0) return 0;
  return (
    samples.reduce((sum, sample) => sum + distance(sample, target), 0) /
    samples.length
  );
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  return distance(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
    t: point.t,
  });
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

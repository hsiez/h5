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

const START = { x: 0.18, y: 0.68 };
const TARGET = { x: 0.78, y: 0.34 };
const HIT_RADIUS = 28;

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
  const samplesRef = useRef<Point[]>([]);
  const pointerTypeRef = useRef("unknown");
  const draggingRef = useRef(false);
  const [phase, setPhase] = useState<"ready" | "dragging" | "missed" | "done">(
    "ready",
  );
  const [marker, setMarker] = useState(START);

  useEffect(() => {
    loadTimeRef.current = performance.now();
  }, []);

  function toPoint(event: React.PointerEvent): Point | null {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    return { x, y, t: performance.now() };
  }

  function pointToRatio(point: Point): { x: number; y: number } {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return START;
    return {
      x: point.x / rect.width,
      y: point.y / rect.height,
    };
  }

  function targetPoint(): Point | null {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.width * TARGET.x,
      y: rect.height * TARGET.y,
      t: performance.now(),
    };
  }

  function startPoint(): Point | null {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.width * START.x,
      y: rect.height * START.y,
      t: performance.now(),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || phase === "done") return;
    const point = toPoint(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point.t;
    samplesRef.current = [point];
    pointerTypeRef.current = event.pointerType || "unknown";
    draggingRef.current = true;
    setPhase("dragging");
    setMarker(pointToRatio(point));
    onProgress(0.05);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    const point = toPoint(event);
    const target = targetPoint();
    const start = startPoint();
    if (!point || !target || !start) return;

    samplesRef.current.push(point);
    setMarker(pointToRatio(point));
    onProgress(progressTowardTarget(point, target, start));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const point = toPoint(event);
    const target = targetPoint();
    if (!point || !target) return;

    samplesRef.current.push(point);
    setMarker(pointToRatio(point));

    const metrics = buildMetrics(
      samplesRef.current,
      target,
      pointerTypeRef.current,
      dragStartRef.current - loadTimeRef.current,
    );

    if (!metrics.completed) {
      setPhase("missed");
      onProgress(0);
      return;
    }

    setPhase("done");
    onProgress(1);
    onComplete(scoreBehavior(metrics));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled || phase === "done") return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    const now = performance.now();
    const metrics: BehaviorMetrics = {
      completed: true,
      pointerType: "keyboard",
      durationMs: 1000,
      startDelayMs: now - loadTimeRef.current,
      sampleCount: 0,
      pathLength: 0,
      straightDistance: 0,
      pathRatio: 0,
      meanSpeed: 0,
      speedVariation: 0,
      targetDistance: 0,
    };

    setPhase("done");
    setMarker(TARGET);
    onProgress(1);
    onComplete(scoreBehavior(metrics));
  }

  const statusText =
    phase === "done"
      ? "Interaction captured"
      : phase === "missed"
        ? "Target missed"
        : disabled
          ? "Waiting for browser checks"
          : "Drag marker to target";

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
          className="relative h-[190px] overflow-hidden rounded-md border border-(--color-border-subtle) bg-(--color-background) touch-none select-none"
        >
          <div
            data-vibe-challenge-target
            className="absolute h-12 w-12 rounded-full border-2 border-[#16a34a] bg-[#16a34a]/10"
            style={{
              left: `calc(${TARGET.x * 100}% - 24px)`,
              top: `calc(${TARGET.y * 100}% - 24px)`,
            }}
          />
          <motion.button
            type="button"
            aria-label="Drag marker to target"
            data-vibe-challenge-marker
            disabled={disabled || phase === "done"}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
            onPointerCancel={() => {
              if (draggingRef.current) {
                draggingRef.current = false;
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

  return {
    completed: targetDistance <= HIT_RADIUS,
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
  };
}

function progressTowardTarget(point: Point, target: Point, start: Point): number {
  const startDistance = distance(start, target);
  const currentDistance = distance(point, target);
  if (startDistance <= 0) return 0.05;
  return Math.max(0.05, Math.min(0.95, 1 - currentDistance / startDistance));
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

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

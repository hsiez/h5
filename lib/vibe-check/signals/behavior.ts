import type { LayerScore, SignalDefinition, SignalResult } from "../types";
import { scoreLayer } from "../scoring";

export interface BehaviorMetrics {
  completed: boolean;
  pointerType: string;
  durationMs: number;
  startDelayMs: number;
  sampleCount: number;
  pathLength: number;
  straightDistance: number;
  pathRatio: number;
  meanSpeed: number;
  speedVariation: number;
  targetDistance: number;
}

function result(
  id: string,
  rawValue: unknown,
  score: number,
  detail: string,
): SignalResult {
  return {
    id,
    rawValue,
    score: Math.max(0, Math.min(100, Math.round(score))),
    detail,
    status: "complete",
  };
}

function inertCollect(id: string): SignalResult {
  return {
    id,
    rawValue: null,
    score: 50,
    detail: "Collected by the interaction challenge",
    status: "error",
  };
}

export const behaviorSignals: SignalDefinition[] = [
  {
    id: "interaction_completion",
    name: "Task completion",
    description: "Scores whether the challenge was completed at human pace",
    category: "behavior",
    layer: 4,
    weight: 0.25,
    collect: () => inertCollect("interaction_completion"),
  },
  {
    id: "pointer_sampling",
    name: "Pointer sampling",
    description: "Scores the amount of pointer/touch movement evidence",
    category: "behavior",
    layer: 4,
    weight: 0.2,
    collect: () => inertCollect("pointer_sampling"),
  },
  {
    id: "pointer_path_shape",
    name: "Path shape",
    description: "Scores movement efficiency and path curvature",
    category: "behavior",
    layer: 4,
    weight: 0.25,
    collect: () => inertCollect("pointer_path_shape"),
  },
  {
    id: "pointer_velocity",
    name: "Velocity profile",
    description: "Scores whether movement velocity varies naturally",
    category: "behavior",
    layer: 4,
    weight: 0.2,
    collect: () => inertCollect("pointer_velocity"),
  },
  {
    id: "time_to_interact",
    name: "Time to interact",
    description: "Scores the delay before the first deliberate interaction",
    category: "behavior",
    layer: 4,
    weight: 0.1,
    collect: () => inertCollect("time_to_interact"),
  },
];

export function scoreBehavior(metrics: BehaviorMetrics): LayerScore {
  const completionScore = scoreCompletion(metrics);
  const samplingScore = scoreSampling(metrics);
  const pathScore = scorePath(metrics);
  const velocityScore = scoreVelocity(metrics);
  const startDelayScore = scoreStartDelay(metrics);

  const results: SignalResult[] = [
    result(
      "interaction_completion",
      {
        completed: metrics.completed,
        durationMs: metrics.durationMs,
        targetDistance: metrics.targetDistance,
      },
      completionScore,
      completionDetail(metrics),
    ),
    result(
      "pointer_sampling",
      {
        pointerType: metrics.pointerType,
        sampleCount: metrics.sampleCount,
      },
      samplingScore,
      `${metrics.sampleCount} movement sample(s) captured`,
    ),
    result(
      "pointer_path_shape",
      {
        pathLength: Math.round(metrics.pathLength),
        straightDistance: Math.round(metrics.straightDistance),
        pathRatio: round(metrics.pathRatio),
      },
      pathScore,
      `Path ratio ${round(metrics.pathRatio)}`,
    ),
    result(
      "pointer_velocity",
      {
        meanSpeed: round(metrics.meanSpeed),
        speedVariation: round(metrics.speedVariation),
      },
      velocityScore,
      `Velocity variation ${round(metrics.speedVariation)}`,
    ),
    result(
      "time_to_interact",
      { startDelayMs: metrics.startDelayMs },
      startDelayScore,
      `${Math.round(metrics.startDelayMs)}ms before first interaction`,
    ),
  ];

  return scoreLayer(4, "Interaction Pattern", results, behaviorSignals);
}

function scoreCompletion(metrics: BehaviorMetrics): number {
  if (!metrics.completed) return 0;
  if (metrics.durationMs < 250) return 20;
  if (metrics.durationMs < 500) return 55;
  if (metrics.durationMs <= 8000) return 100;
  if (metrics.durationMs <= 15000) return 75;
  return 45;
}

function scoreSampling(metrics: BehaviorMetrics): number {
  if (metrics.pointerType === "keyboard") return 75;
  if (!metrics.completed) return 0;
  if (metrics.sampleCount >= 12) return 100;
  if (metrics.sampleCount >= 6) return 80;
  if (metrics.sampleCount >= 3) return 55;
  return 30;
}

function scorePath(metrics: BehaviorMetrics): number {
  if (metrics.pointerType === "keyboard") return 75;
  if (!metrics.completed || metrics.straightDistance <= 0) return 0;
  if (metrics.pathRatio >= 1.04 && metrics.pathRatio <= 2.2) return 100;
  if (metrics.pathRatio >= 1.015 && metrics.pathRatio < 1.04) return 75;
  if (metrics.pathRatio > 2.2 && metrics.pathRatio <= 3) return 70;
  if (metrics.pathRatio > 3) return 45;
  return 35;
}

function scoreVelocity(metrics: BehaviorMetrics): number {
  if (metrics.pointerType === "keyboard") return 75;
  if (!metrics.completed) return 0;
  if (metrics.sampleCount < 6) return 45;
  if (metrics.speedVariation >= 0.35) return 100;
  if (metrics.speedVariation >= 0.2) return 80;
  if (metrics.speedVariation >= 0.1) return 55;
  return 35;
}

function scoreStartDelay(metrics: BehaviorMetrics): number {
  if (metrics.startDelayMs >= 500 && metrics.startDelayMs <= 30000) return 100;
  if (metrics.startDelayMs >= 200) return 75;
  if (metrics.startDelayMs > 0) return 45;
  return 35;
}

function completionDetail(metrics: BehaviorMetrics): string {
  if (!metrics.completed)
    return `Target missed by ${Math.round(metrics.targetDistance)}px`;
  return `Completed in ${Math.round(metrics.durationMs)}ms`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

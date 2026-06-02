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
  gatesPassed: number;
  totalGates: number;
  boundaryViolations: number;
  holdDurationMs: number;
  holdSampleCount: number;
  holdDrift: number;
  holdMovementRatio: number;
  holdIntervalVariation: number;
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
  {
    id: "interaction_control",
    name: "Control path",
    description: "Scores ring order and corridor control during the challenge",
    category: "behavior",
    layer: 4,
    weight: 0.2,
    collect: () => inertCollect("interaction_control"),
  },
  {
    id: "hold_steadiness",
    name: "Hold plausibility",
    description: "Scores final hold duration without rewarding synthetic stillness",
    category: "behavior",
    layer: 4,
    weight: 0.15,
    collect: () => inertCollect("hold_steadiness"),
  },
];

export function scoreBehavior(metrics: BehaviorMetrics): LayerScore {
  const completionScore = scoreCompletion(metrics);
  const samplingScore = scoreSampling(metrics);
  const pathScore = scorePath(metrics);
  const velocityScore = scoreVelocity(metrics);
  const startDelayScore = scoreStartDelay(metrics);
  const controlScore = scoreControl(metrics);
  const holdScore = scoreHold(metrics);

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
      "interaction_control",
      {
        gatesPassed: metrics.gatesPassed,
        totalGates: metrics.totalGates,
        boundaryViolations: metrics.boundaryViolations,
      },
      controlScore,
      `${metrics.gatesPassed}/${metrics.totalGates} gates passed, ${metrics.boundaryViolations} corridor miss(es)`,
    ),
    result(
      "hold_steadiness",
      {
        holdDurationMs: metrics.holdDurationMs,
        holdSampleCount: metrics.holdSampleCount,
        holdDrift: round(metrics.holdDrift),
        holdMovementRatio: round(metrics.holdMovementRatio),
        holdIntervalVariation: round(metrics.holdIntervalVariation),
      },
      holdScore,
      holdDetail(metrics),
    ),
    result(
      "time_to_interact",
      { startDelayMs: metrics.startDelayMs },
      startDelayScore,
      `${Math.round(metrics.startDelayMs)}ms before first interaction`,
    ),
  ];

  const layer = scoreLayer(4, "Interaction Pattern", results, behaviorSignals);
  const mechanicalDrag =
    metrics.completed &&
    metrics.pointerType !== "keyboard" &&
    metrics.sampleCount >= 8 &&
    metrics.pathRatio < 1.08 &&
    metrics.boundaryViolations === 0 &&
    metrics.holdDrift < 4;

  return mechanicalDrag
    ? { ...layer, score: Math.min(layer.score, 55) }
    : layer;
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
  if (metrics.pathRatio >= 1.1 && metrics.pathRatio <= 2.2) return 100;
  if (metrics.pathRatio >= 1.06 && metrics.pathRatio < 1.1) return 70;
  if (metrics.pathRatio >= 1.015 && metrics.pathRatio < 1.06) return 50;
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

function scoreControl(metrics: BehaviorMetrics): number {
  if (metrics.pointerType === "keyboard") return 75;
  if (metrics.totalGates <= 0) return 50;
  const gateRatio = metrics.gatesPassed / metrics.totalGates;
  let score = Math.round(gateRatio * 100);
  score -= Math.min(40, metrics.boundaryViolations * 4);
  return Math.max(0, score);
}

function scoreHold(metrics: BehaviorMetrics): number {
  if (metrics.pointerType === "keyboard") return 75;
  if (!metrics.completed && metrics.holdDurationMs < 500) return 20;
  if (metrics.holdDurationMs < 700) return 45;

  if (metrics.holdSampleCount < 4) return 85;

  const repeatedStillness =
    metrics.holdSampleCount >= 8 &&
    metrics.holdDrift < 4 &&
    metrics.holdMovementRatio < 0.2;
  const regularCadence =
    metrics.holdSampleCount >= 8 && metrics.holdIntervalVariation < 0.12;

  if (repeatedStillness && regularCadence) return 25;
  if (repeatedStillness) return 45;
  if (regularCadence) return 65;
  if (metrics.holdDrift <= 18) return 100;
  if (metrics.holdDrift <= 30) return 75;
  return 45;
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

function holdDetail(metrics: BehaviorMetrics): string {
  const drift = round(metrics.holdDrift);
  const movement = round(metrics.holdMovementRatio);
  const cadence = round(metrics.holdIntervalVariation);
  const base = `${Math.round(metrics.holdDurationMs)}ms hold, ${drift}px drift`;
  if (metrics.pointerType === "keyboard") return `${base}, keyboard fallback`;
  if (metrics.holdSampleCount < 4) return `${base}, sparse hold evidence`;
  if (
    metrics.holdSampleCount >= 8 &&
    metrics.holdDrift < 4 &&
    metrics.holdMovementRatio < 0.2 &&
    metrics.holdIntervalVariation < 0.12
  ) {
    return `${base}, repeated stillness at regular cadence`;
  }
  if (
    metrics.holdSampleCount >= 8 &&
    metrics.holdDrift < 4 &&
    metrics.holdMovementRatio < 0.2
  ) {
    return `${base}, repeated stillness`;
  }
  if (metrics.holdSampleCount >= 8 && metrics.holdIntervalVariation < 0.12) {
    return `${base}, regular hold cadence`;
  }
  return `${base}, movement ${movement}, cadence ${cadence}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

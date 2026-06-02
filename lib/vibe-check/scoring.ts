import type {
  SignalResult,
  SignalDefinition,
  LayerScore,
  VibeCheckScorecard,
  Verdict,
} from "./types";

function verdictFromScore(score: number): Verdict {
  if (score >= 90) return "human";
  if (score >= 70) return "likely_human";
  if (score >= 40) return "likely_bot";
  return "bot";
}

const HARD_AUTOMATION_IDS = new Set([
  "nav_webdriver",
  "cdp_bindings",
  "webdriver_descriptor",
  "fn_tostring_lie",
]);

export function scoreLayer(
  layerNum: number,
  name: string,
  results: SignalResult[],
  definitions: SignalDefinition[],
): LayerScore {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const def of definitions) {
    const result = results.find((s) => s.id === def.id);
    if (!result || result.status === "error") continue;
    weightedSum += def.weight * result.score;
    totalWeight += def.weight;
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
  return { layer: layerNum, name, score, signals: results };
}

export function scoreComposite(layers: LayerScore[]): VibeCheckScorecard {
  const automation = layers.find((l) => l.layer === 1)?.score ?? 50;
  const fingerprint = layers.find((l) => l.layer === 2)?.score ?? 50;
  const behaviorLayer = layers.find((l) => l.layer === 4);
  const behavior = layers.find((l) => l.layer === 4)?.score;
  const rawComposite =
    behavior === undefined
      ? Math.round(0.5 * automation + 0.5 * fingerprint)
      : Math.round(0.3 * automation + 0.35 * fingerprint + 0.35 * behavior);
  const hardAutomationFail = layers.some((layer) =>
    layer.signals.some(
      (signal) =>
        signal.status === "complete" &&
        HARD_AUTOMATION_IDS.has(signal.id) &&
        signal.score <= 20,
    ),
  );
  const behaviorFail = behavior !== undefined && behavior <= 35;
  const mechanicalInteraction =
    behaviorLayer?.signals.some(
      (signal) =>
        signal.id === "interaction_completion" &&
        signal.status === "complete" &&
        signal.score >= 80,
    ) &&
    behaviorLayer.signals.some(
      (signal) =>
        signal.id === "pointer_sampling" &&
        signal.status === "complete" &&
        signal.score >= 80,
    ) &&
    behaviorLayer.signals.some(
      (signal) =>
        signal.id === "pointer_path_shape" &&
        signal.status === "complete" &&
        signal.score <= 35,
    );
  const composite = hardAutomationFail
    ? Math.min(rawComposite, 35)
    : behaviorFail
      ? Math.min(rawComposite, 50)
      : mechanicalInteraction
        ? Math.min(rawComposite, 69)
        : rawComposite;

  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    composite,
    verdict: verdictFromScore(composite),
    layers,
  };
}

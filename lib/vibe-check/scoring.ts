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
  const composite = Math.round(0.5 * automation + 0.5 * fingerprint);

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

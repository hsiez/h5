import type {
  SignalDefinition,
  SignalResult,
  VibeCheckScorecard,
} from "./types";
import { scoreLayer, scoreComposite } from "./scoring";
import { automationSignals } from "./signals/automation";
import { fingerprintSignals } from "./signals/fingerprint";

export interface RunnerCallbacks {
  onSignalComplete?: (result: SignalResult, progress: number) => void;
  onLayerComplete?: (layerNum: number, score: number) => void;
}

const CONSISTENCY_IDS = new Set(["consistency_ua_canvas", "consistency_hw"]);

export async function runVibeCheck(
  callbacks?: RunnerCallbacks,
): Promise<VibeCheckScorecard> {
  const allSignals = [...automationSignals, ...fingerprintSignals];
  const independent = allSignals.filter((s) => !CONSISTENCY_IDS.has(s.id));
  const dependent = allSignals.filter((s) => CONSISTENCY_IDS.has(s.id));
  const totalCount = allSignals.length;

  const results: SignalResult[] = [];
  let completed = 0;

  async function runSignal(
    def: SignalDefinition,
    prior?: SignalResult[],
  ): Promise<SignalResult> {
    try {
      return await def.collect(prior);
    } catch {
      return {
        id: def.id,
        rawValue: null,
        score: 50,
        detail: "Signal threw an unhandled exception",
        status: "error",
      };
    }
  }

  const independentPromises = independent.map(async (def) => {
    const result = await runSignal(def);
    results.push(result);
    completed++;
    callbacks?.onSignalComplete?.(result, completed / totalCount);
    return result;
  });

  await Promise.allSettled(independentPromises);

  for (const def of dependent) {
    const result = await runSignal(def, results);
    results.push(result);
    completed++;
    callbacks?.onSignalComplete?.(result, completed / totalCount);
  }

  const layer1Results = results.filter((r) =>
    automationSignals.some((s) => s.id === r.id),
  );
  const layer2Results = results.filter((r) =>
    fingerprintSignals.some((s) => s.id === r.id),
  );

  const layer1 = scoreLayer(
    1,
    "Automation Artifacts",
    layer1Results,
    automationSignals,
  );
  const layer2 = scoreLayer(
    2,
    "Environment Consistency",
    layer2Results,
    fingerprintSignals,
  );

  callbacks?.onLayerComplete?.(1, layer1.score);
  callbacks?.onLayerComplete?.(2, layer2.score);

  return scoreComposite([layer1, layer2]);
}

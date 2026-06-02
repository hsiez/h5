"use client";

import { useEffect, useState } from "react";
import type { LayerScore, VibeCheckScorecard } from "@/lib/vibe-check/types";
import { runVibeCheck } from "@/lib/vibe-check/runner";
import { scoreComposite } from "@/lib/vibe-check/scoring";
import { ScoreHero } from "./score-hero";
import { LayerCard } from "./layer-card";
import { BehaviorChallenge } from "./behavior-challenge";

export function VibeCheckClient() {
  const [scorecard, setScorecard] = useState<VibeCheckScorecard | null>(null);
  const [baseLayers, setBaseLayers] = useState<LayerScore[] | null>(null);
  const [behaviorLayer, setBehaviorLayer] = useState<LayerScore | null>(null);
  const [browserProgress, setBrowserProgress] = useState(0);
  const [behaviorProgress, setBehaviorProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await runVibeCheck({
        onSignalComplete: (_signal, pct) => {
          if (!cancelled) setBrowserProgress(pct);
        },
      });
      if (!cancelled) setBaseLayers(result.layers);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleBehaviorComplete(layer: LayerScore) {
    if (!baseLayers) return;
    setBehaviorLayer(layer);
    setScorecard(scoreComposite([...baseLayers, layer]));
  }

  const layers = scorecard?.layers ?? [
    ...(baseLayers ?? []),
    ...(behaviorLayer ? [behaviorLayer] : []),
  ];
  const progress =
    scorecard !== null
      ? 1
      : baseLayers
        ? 0.75 + behaviorProgress * 0.25
        : browserProgress * 0.75;

  return (
    <main className="flex flex-1 flex-col bg-(--color-background) px-6 py-16">
      <div className="mx-auto w-full" style={{ maxWidth: 768 }}>
        <header className="mb-12">
          <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
            Vibe Check
          </h1>
          <p className="mt-2 text-base text-(--color-text-tertiary)">
            Browser automation and environment anomaly scorecard
          </p>
        </header>

        <section className="flex flex-col gap-10">
          <ScoreHero
            score={scorecard?.composite ?? null}
            verdict={scorecard?.verdict ?? null}
            progress={progress}
          />

          <div className="flex flex-col gap-4">
            <LayerCard
              layer={layers.find((l) => l.layer === 1) ?? null}
            />
            <LayerCard
              layer={layers.find((l) => l.layer === 2) ?? null}
            />
            {baseLayers && !behaviorLayer && (
              <BehaviorChallenge
                disabled={false}
                onComplete={handleBehaviorComplete}
                onProgress={setBehaviorProgress}
              />
            )}
            <LayerCard
              layer={layers.find((l) => l.layer === 4) ?? null}
            />
          </div>
        </section>
      </div>

      {scorecard && (
        <script
          id="vibe-result"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(scorecard).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </main>
  );
}

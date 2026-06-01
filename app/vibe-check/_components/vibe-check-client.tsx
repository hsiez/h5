"use client";

import { useEffect, useState, useCallback } from "react";
import type { VibeCheckScorecard } from "@/lib/vibe-check/types";
import { runVibeCheck } from "@/lib/vibe-check/runner";
import { ScoreHero } from "./score-hero";
import { LayerCard } from "./layer-card";

export function VibeCheckClient() {
  const [scorecard, setScorecard] = useState<VibeCheckScorecard | null>(null);
  const [progress, setProgress] = useState(0);

  const run = useCallback(async () => {
    const result = await runVibeCheck({
      onSignalComplete: (_signal, pct) => {
        setProgress(pct);
      },
    });
    setScorecard(result);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <main className="flex flex-1 flex-col bg-(--color-background) px-6 py-16">
      <div className="mx-auto w-full" style={{ maxWidth: 768 }}>
        <header className="mb-12">
          <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
            Vibe Check
          </h1>
          <p className="mt-2 text-base text-(--color-text-tertiary)">
            Bot detection scorecard
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
              layer={
                scorecard?.layers.find((l) => l.layer === 1) ?? null
              }
            />
            <LayerCard
              layer={
                scorecard?.layers.find((l) => l.layer === 2) ?? null
              }
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

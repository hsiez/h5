const ROWS: Array<[string, string, string]> = [
  [
    "classifyTurn",
    "LLM Judge",
    "Tag what the user is asking for: new_feature / adjustment / error_fix.",
  ],
  [
    "evalPlanToolInteractions",
    "deterministic",
    "Did the user engage with offered plan tools, or skip them?",
  ],
  [
    "evalSandboxAlignment",
    "LLM Judge",
    "Did the build address what the user asked for?",
  ],
  [
    "createSandboxAgentEval",
    "LLM Judge",
    "Quality of the orchestrator prompt — clarity + context completeness.",
  ],
  [
    "createConversationHealthSpan",
    "aggregation",
    "Roll-up across the whole conversation.",
  ],
  [
    "rescoreWithFollowUp",
    "LLM Judge",
    "Re-grade alignment using the user's actual reaction.",
  ],
  [
    "sendQualityAlert",
    "Slack",
    "Page on negative sentiment + revised score < 0.5.",
  ],
];

export function RubricSlide() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <p className="text-base text-(--color-text-secondary) max-w-prose">
        Every row below maps 1:1 to an async function inside{" "}
        <span className="font-mono text-(--color-text-primary)">
          chatTurnEvalWorkflow
        </span>
        . The rubric isn&apos;t a spec the Workflow follows — the rubric{" "}
        <span className="text-(--color-text-primary) font-medium">is</span>{" "}
        the Workflow.
      </p>
      <div className="flex flex-col">
        {ROWS.map(([step, model, purpose]) => (
          <div
            key={step}
            className="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_minmax(0,8rem)_1fr] gap-x-6 gap-y-1 py-3 border-b border-(--color-border) text-base"
          >
            <div className="font-mono text-(--color-text-primary) break-all">
              {step}
            </div>
            <div className="hidden md:block font-mono text-sm text-(--color-text-tertiary) md:self-center">
              {model}
            </div>
            <div className="text-(--color-text-secondary)">{purpose}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

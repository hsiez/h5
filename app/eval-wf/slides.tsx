import { AnatomySlide } from "./AnatomySlide";
import { FlowSlide } from "./FlowSlide";
import { ScoringSlide } from "./ScoringSlide";
import { WINS_STEPS, WinsSlide } from "./WinsSlide";
import type { SlideContent } from "./types";

type ArrowDir = "up" | "down" | "left" | "right";

const ARROW_PATHS: Record<ArrowDir, string> = {
  down: "M12 5v14m0 0l-7-7m7 7l7-7",
  up: "M12 19V5m0 0l-7 7m7-7l7 7",
  left: "M19 12H5m0 0l7 7m-7-7l7-7",
  right: "M5 12h14m0 0l-7-7m7 7l-7 7",
};

function KeyChip({
  children,
  square = false,
}: {
  children: React.ReactNode;
  square?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-(--color-text-primary) text-white rounded-md h-7 text-xs font-medium ${
        square ? "w-7" : "px-3"
      }`}
    >
      {children}
    </span>
  );
}

function ArrowKey({ dir }: { dir: ArrowDir }) {
  return (
    <KeyChip square>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={ARROW_PATHS[dir]} />
      </svg>
    </KeyChip>
  );
}

export const slides: SlideContent[] = [
  {
    id: "intro",
    title: (
      <>
        Vercel Workflows{" "}
        <span className="text-(--color-text-tertiary)">
          Powering chat evals
        </span>
      </>
    ),
    body: (
      <div className="flex flex-col gap-10">
        <p className="text-lg max-w-prose">
          A walkthrough of how Reforge Build evaluates the performance of
          chat-based agents using workflows.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-(--color-text-tertiary)">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <ArrowKey dir="down" />
              <ArrowKey dir="right" />
            </span>
            <span>next</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <ArrowKey dir="up" />
              <ArrowKey dir="left" />
            </span>
            <span>previous</span>
          </span>
          <span className="flex items-center gap-2">
            <KeyChip>Space</KeyChip>
            <span>advance</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "Problem space",
    title: "Score every turn — don't slow the chat",
    body: (
      <div className="flex flex-col gap-6 max-w-prose">
        <p>
          We grade every agent turn{" "}
          <span className="text-(--color-text-primary) font-medium">
            post-hoc
          </span>{" "}
          — LLM-as-judge over the response, the build, the prompt, and the
          user&apos;s reaction.
        </p>
        <p>
          None of it can sit in the chat request path. Users are mid-flow;
          any added latency is a regression we&apos;d notice immediately.
        </p>
        <p>
          So evals run as{" "}
          <span className="text-(--color-text-primary) font-medium">
            background jobs
          </span>{" "}
          — async, durable, and ideally able to pause for hours waiting on
          the user&apos;s next message. That requirement set is what pushed
          us to{" "}
          <span className="text-(--color-text-primary) font-medium">
            Vercel Workflows
          </span>
          .
        </p>
      </div>
    ),
  },
  {
    id: "scoring",
    eyebrow: "Scoring method",
    title: "Score per turn, aggregate to health",
    steps: 3,
    body: (step) => <ScoringSlide step={step} />,
  },
  {
    id: "anatomy",
    eyebrow: "What we score",
    title: "One turn",
    steps: 7,
    body: (step) => <AnatomySlide step={step} />,
  },
  {
    id: "rubric",
    eyebrow: "Rubric → workflow",
    title: "Inside the eval rubric",
    body: (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-(--color-text-secondary) max-w-prose">
          Every row below maps 1:1 to an async function inside{" "}
          <span className="font-mono text-(--color-text-primary)">
            chatTurnEvalWorkflow
          </span>
          . The rubric isn&apos;t a spec the workflow follows — the rubric{" "}
          <span className="text-(--color-text-primary) font-medium">is</span>{" "}
          the workflow.
        </p>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border-strong)">
              <th className="text-left py-3 pr-4 font-medium text-(--color-text-tertiary) text-xs uppercase tracking-wide">
                Workflow step
              </th>
              <th className="text-left py-3 pr-4 font-medium text-(--color-text-tertiary) text-xs uppercase tracking-wide">
                Model
              </th>
              <th className="text-left py-3 font-medium text-(--color-text-tertiary) text-xs uppercase tracking-wide">
                Purpose
              </th>
            </tr>
          </thead>
          <tbody className="text-(--color-text-secondary)">
            {[
              [
                "classifyTurn",
                "gpt-5-mini",
                "Tag what the user is asking for: new_feature / adjustment / error_fix.",
              ],
              [
                "evalPlanToolInteractions",
                "deterministic",
                "Did the user engage with offered plan tools, or skip them?",
              ],
              [
                "evalSandboxAlignment",
                "gpt-5-mini",
                "Did the build address what the user asked for?",
              ],
              [
                "createSandboxAgentEval",
                "gpt-5-mini",
                "Quality of the orchestrator prompt — clarity + context completeness.",
              ],
              [
                "createConversationHealthSpan",
                "aggregation",
                "Roll-up across the whole conversation.",
              ],
              [
                "rescoreWithFollowUp",
                "gpt-5-mini",
                "Re-grade alignment using the user's actual reaction.",
              ],
              [
                "sendQualityAlert",
                "Slack",
                "Page on negative sentiment + revised score < 0.5.",
              ],
            ].map(([step, model, purpose]) => (
              <tr
                key={step}
                className="border-b border-(--color-border)"
              >
                <td className="py-3 pr-4 font-mono text-(--color-text-primary)">
                  {step}
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-(--color-text-tertiary)">
                  {model}
                </td>
                <td className="py-3">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    ),
  },
  {
    id: "workflow-fork",
    eyebrow: "Workflow shape",
    title: "Eval, wait, alert",
    body: <FlowSlide />,
  },
  {
    id: "wins",
    eyebrow: "Wins",
    title: "Why Vercel Workflows",
    steps: WINS_STEPS,
    body: (step) => <WinsSlide step={step} />,
  },
];

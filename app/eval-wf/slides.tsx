import { AnatomySlide } from "./AnatomySlide";
import { FlowSlide } from "./FlowSlide";
import type { SlideContent } from "./types";

const bullets = "list-disc pl-5 space-y-2 marker:text-(--color-text-tertiary)";

export const slides: SlideContent[] = [
  {
    id: "intro",
    title: (
      <>
        Vercel Workflows.{" "}
        <span className="text-(--color-text-tertiary)">
          Powering turn-based chat evals.
        </span>
      </>
    ),
    body: (
      <div className="flex flex-col gap-10">
        <p className="text-lg max-w-prose">
          A walkthrough of how Reforge Build scores every assistant turn —
          durably, asynchronously, and with the user&apos;s next message as
          ground truth.
        </p>
        <p className="text-sm font-medium text-(--color-text-tertiary)">
          ↓ / → next &nbsp;·&nbsp; ↑ / ← previous &nbsp;·&nbsp; space to
          advance
        </p>
      </div>
    ),
  },
  {
    id: "context",
    eyebrow: "Context · Protoforge",
    title: "Users converse with Claude to build prototypes.",
    body: (
      <div className="flex flex-col gap-6 max-w-prose">
        <p>
          Plan tools → wireframe → build → iterate. Turn by turn, conversation
          by conversation.
        </p>
        <p>
          We needed to know — automatically and continuously —{" "}
          <span className="text-(--color-text-primary) font-medium">
            is the assistant actually doing a good job?
          </span>
        </p>
      </div>
    ),
  },
  {
    id: "anatomy",
    eyebrow: "What we score",
    title: "One turn.",
    steps: 7,
    body: (step) => <AnatomySlide step={step} />,
  },
  {
    id: "rubric",
    eyebrow: "What we measure",
    title: "The eval rubric.",
    body: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border-strong)">
              <th className="text-left py-3 pr-4 font-medium text-(--color-text-tertiary) text-xs uppercase tracking-wide">
                Step
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
    ),
  },
  {
    id: "workflow-fork",
    eyebrow: "Workflow shape",
    title: "One follow-up. Two evals.",
    body: <FlowSlide />,
  },
  {
    id: "system",
    eyebrow: "What we built",
    title: "A turn-based eval system.",
    body: (
      <div className="flex flex-col gap-8 max-w-prose">
        <ul className={bullets}>
          <li>Fires after every assistant turn — non-blocking.</li>
          <li>
            Runs 4–5 LLM-as-judge evaluations per turn (classify, plan-tool
            engagement, build alignment, prompt quality).
          </li>
          <li>
            Composes turn-level scores into a conversation-level health score.
          </li>
          <li>
            <span className="text-(--color-text-primary) font-medium">
              Waits up to 24 hours
            </span>{" "}
            for the user&apos;s next message and re-scores the previous turn
            using their real follow-up as ground truth.
          </li>
          <li>Logs everything to Braintrust. Pages Slack on regressions.</li>
        </ul>
        <p className="text-sm text-(--color-text-tertiary)">
          The whole thing runs on Vercel Workflows. That choice is what made
          it tractable.
        </p>
      </div>
    ),
  },
];

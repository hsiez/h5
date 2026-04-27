import { AboutSlide } from "./AboutSlide";
import { ActionsSlide } from "./ActionsSlide";
import { AnatomySlide } from "./AnatomySlide";
import { ClosingSlide } from "./ClosingSlide";
import { DEMO_STEPS, DemoSlide } from "./DemoSlide";
import { FlowSlide } from "./FlowSlide";
import { TraceScoringSlide, TracesSlide } from "./TracesSlide";
import { WINS_STEPS, WinsSlide } from "./WinsSlide";
import { useOrientation } from "./orientation";
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
      className={`inline-flex items-center justify-center bg-(--color-text-primary) text-white rounded-md h-8 text-sm font-medium ${
        square ? "w-8" : "px-3"
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
        width="16"
        height="16"
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

function IntroSlideBody() {
  const isPortrait = useOrientation() === "portrait";
  return (
    <div className="flex flex-col gap-10">
      <p
        className={`max-w-prose ${isPortrait ? "text-base" : "text-lg"}`}
      >
        A walkthrough of how Reforge Build evaluates the performance of
        chat-based agents using Workflows.
      </p>
      {isPortrait ? (
        <div className="flex items-center gap-3 text-base font-medium text-(--color-text-tertiary)">
          <span className="inline-flex items-center justify-center bg-(--color-text-primary) text-white rounded-md h-8 w-8">
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
              <path d="M12 5v14m0 0l-5-5m5 5l5-5M12 5l-5 5m5-5l5 5" />
            </svg>
          </span>
          <span>swipe up / down to navigate</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-base font-medium text-(--color-text-tertiary)">
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
      )}
    </div>
  );
}

function GeneratingEvalsBody() {
  const isPortrait = useOrientation() === "portrait";
  return (
    <div className={`flex flex-col ${isPortrait ? "gap-10" : "gap-14"}`}>
      <p className="max-w-prose">
        An{" "}
        <span className="text-(--color-text-primary) font-medium">
          evaluation (&ldquo;eval&rdquo;)
        </span>{" "}
        is a test for an AI system: give an AI an input, then apply grading
        logic to its output to measure success.
      </p>
      <div
        className={`flex items-start ${
          isPortrait ? "flex-col gap-6" : "flex-row gap-10"
        }`}
      >
        <div
          className={`flex flex-col gap-2 max-w-prose ${
            isPortrait ? "text-base" : "text-lg"
          }`}
        >
          <p className="text-(--color-text-tertiary) text-sm uppercase tracking-wide font-medium">
            Generating evals
          </p>
          <p className="text-(--color-text-secondary)">
            For generating evals that measure something meaningful, we lean on{" "}
            <a
              href="https://www.colehoffer.ai/articles/evaluating-chat-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
            >
              this post by Cole Hoffer
            </a>{" "}
            — using human follow-up behavior as ground truth and scoring
            against specific instruction adherence instead of vague relevance.
          </p>
        </div>
        <a
          href="https://www.colehoffer.ai/articles/evaluating-chat-agents"
          target="_blank"
          rel="noopener noreferrer"
          className={`block shrink-0 rounded-xl overflow-hidden border border-(--color-border) shadow-md transition-shadow hover:shadow-lg ${
            isPortrait ? "w-full max-w-[360px]" : "w-[260px]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.colehoffer.ai/imgs/alaskaFull.png"
            alt="Evaluating LLM Chat Agents with Real World Signals"
            width={1200}
            height={630}
            className="w-full h-auto block"
          />
        </a>
      </div>
    </div>
  );
}

export const slides: SlideContent[] = [
  {
    id: "intro",
    title: (
      <>
        Evals with agency{" "}
        <span className="text-(--color-text-tertiary)">
          Powered by Workflows
        </span>
      </>
    ),
    body: <IntroSlideBody />,
  },
  {
    id: "about",
    title: "About me",
    body: <AboutSlide />,
  },
  {
    id: "generating-evals",
    title: "First, what are evals?",
    body: <GeneratingEvalsBody />,
  },
  {
    id: "traces",
    title: "Traces are what we evaluate",
    body: (
      <div className="flex flex-col gap-4 max-w-prose">
        <p>
          A{" "}
          <span className="text-(--color-text-primary) font-medium">
            trace
          </span>{" "}
          is step-by-step visibility into an agent&apos;s execution — reasoning,
          tool calls, sub-agent runs, and latency, captured as a nested
          timeline.
        </p>
        <p>
          Our chat agent writes traces to{" "}
          <span className="text-(--color-text-primary) font-medium">
            Braintrust
          </span>{" "}
          during every turn. It&apos;s how we debug why a response went wrong.
        </p>
        <p>
          Evals read those same traces post-hoc — no re-running the agent, just
          scoring what already happened.
        </p>
      </div>
    ),
  },
  {
    id: "trace-example",
    title: "What a trace looks like",
    body: <TracesSlide />,
  },
  {
    id: "score-spans",
    title: "Score each span, aggregate to health",
    steps: 3,
    body: (step) => <TraceScoringSlide step={step} />,
  },
  {
    id: "workflow-fork",
    title: "Eval rubric Workflow",
    body: <FlowSlide />,
  },
  {
    id: "anatomy",
    title: "Why pause the Workflow",
    steps: 7,
    body: (step) => <AnatomySlide step={step} />,
  },
  {
    id: "evals-what-do",
    title: (
      <>
        Cool, we have evals.{" "}
        <span className="text-(--color-text-tertiary)">
          What do they do?
        </span>
      </>
    ),
    body: (
      <div className="flex flex-col gap-6 max-w-prose">
        <p>
          By default, eval results pile up in{" "}
          <span className="text-(--color-text-primary) font-medium">
            Braintrust
          </span>{" "}
          — graphs on graphs on graphs. The team watches the dashboard the
          first week after launch, then forgets it exists.
        </p>
        <p>
          That&apos;s a lot of signal going nowhere. We want evals to{" "}
          <span className="text-(--color-text-primary) font-medium">
            nudge action
          </span>{" "}
          — not wait for someone to go look.
        </p>
      </div>
    ),
  },
  {
    id: "actions",
    title: "Actions based on evals",
    steps: 4,
    body: (step) => <ActionsSlide step={step} />,
  },
  {
    id: "demo",
    title: "See it in motion",
    steps: DEMO_STEPS,
    body: (step) => <DemoSlide step={step} />,
  },
  {
    id: "wins",
    title: "Why Vercel Workflows",
    steps: WINS_STEPS,
    body: (step) => <WinsSlide step={step} />,
  },
  {
    id: "closing",
    body: <ClosingSlide />,
  },
];

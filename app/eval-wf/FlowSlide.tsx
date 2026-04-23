"use client";

const TOP_NODES = [
  "Trigger",
  "Classify",
  "Score plan",
  "Stash hook",
  "Score align",
  "Roll up",
  "Wait",
  "Rescore",
];

const BOT_NODES = ["Trigger", "Classify", "Score plan", "Stash hook", "..."];

// Index of the column where the follow-up forks: top has "Wait", bottom has
// "Trigger". They align vertically but are distinct nodes.
const FORK_INDEX = 6;

const VB_W = 800;
const VB_H = 320;
const PAD_X = 40;
const ROW_TOP_Y = 80;
const ROW_BOT_Y = 240;
const NODE_R = 6;

function nodeX(index: number, total: number) {
  const span = VB_W - PAD_X * 2;
  return PAD_X + (index * span) / (total - 1);
}

export function FlowSlide() {
  const topX = (i: number) => nodeX(i, TOP_NODES.length);
  const stepWidth = topX(1) - topX(0);
  const botX = (i: number) => topX(FORK_INDEX) + i * stepWidth;
  const forkX = topX(FORK_INDEX);

  return (
    <div className="flex flex-col gap-10">
      <div className="w-full max-w-content">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto"
          aria-label="Eval Workflow with follow-up fork"
        >
          <line
            x1={topX(0)}
            y1={ROW_TOP_Y}
            x2={topX(TOP_NODES.length - 1)}
            y2={ROW_TOP_Y}
            stroke="rgba(20,20,20,0.16)"
            strokeWidth="1"
          />
          {TOP_NODES.map((label, i) => (
            <g key={`t${i}`} transform={`translate(${topX(i)}, ${ROW_TOP_Y})`}>
              <circle
                r={NODE_R}
                fill={
                  i === FORK_INDEX
                    ? "var(--color-accent-500)"
                    : "var(--color-text-primary)"
                }
              />
              <text
                y={-18}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(20,20,20,0.6)"
                fontWeight={500}
              >
                {label}
              </text>
            </g>
          ))}

          <line
            x1={botX(0)}
            y1={ROW_BOT_Y}
            x2={botX(BOT_NODES.length - 1)}
            y2={ROW_BOT_Y}
            stroke="rgba(20,20,20,0.16)"
            strokeWidth="1"
          />
          {BOT_NODES.map((label, i) => (
            <g key={`b${i}`} transform={`translate(${botX(i)}, ${ROW_BOT_Y})`}>
              <circle
                r={NODE_R}
                fill={
                  i === 0
                    ? "var(--color-accent-500)"
                    : "var(--color-text-primary)"
                }
              />
              <text
                y={22}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(20,20,20,0.6)"
                fontWeight={500}
              >
                {label}
              </text>
            </g>
          ))}

          <line
            x1={forkX}
            y1={ROW_TOP_Y + NODE_R + 4}
            x2={forkX}
            y2={ROW_BOT_Y - NODE_R - 4}
            stroke="var(--color-accent-500)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />

          <g transform={`translate(${forkX}, ${(ROW_TOP_Y + ROW_BOT_Y) / 2})`}>
            <rect
              x={-62}
              y={-12}
              width={124}
              height={24}
              rx={12}
              fill="var(--color-background)"
              stroke="var(--color-accent-500)"
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              y={4}
              fontSize="11"
              fill="var(--color-accent-500)"
              fontWeight={500}
            >
              follow-up message
            </text>
          </g>
        </svg>
      </div>

      <div className="text-base text-(--color-text-secondary) max-w-content w-full">
        <div className="text-sm font-medium uppercase tracking-wide text-(--color-text-tertiary) mb-2">
          Span by span
        </div>
        <p className="max-w-prose">
          Each span runs through a flow of evaluation steps — some{" "}
          <span className="text-(--color-text-primary) font-medium">
            LLM-as-judge
          </span>
          , some{" "}
          <span className="text-(--color-text-primary) font-medium">
            deterministic
          </span>
          . Together they let us speculate how well the agent did, grounded in
          the user&apos;s initial ask and the logs captured in the trace.
        </p>
      </div>
    </div>
  );
}

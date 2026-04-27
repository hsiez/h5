"use client";

import { useOrientation } from "./orientation";

const TOP_NODES = [
  "Trigger",
  "Classify",
  "Score plan",
  "Score align",
  "Roll up",
  "Wait",
  "Rescore",
];

const BOT_NODES = ["Trigger", "Classify", "Score plan", "..."];

// Index of the column where the follow-up forks: top has "Wait", bottom has
// "Trigger". They align vertically but are distinct nodes.
const FORK_INDEX = 5;

const NODE_R = 6;

// Landscape (horizontal) layout
const VB_W = 800;
const VB_H = 320;
const PAD_X = 40;
const ROW_TOP_Y = 80;
const ROW_BOT_Y = 240;

function nodeX(index: number, total: number) {
  const span = VB_W - PAD_X * 2;
  return PAD_X + (index * span) / (total - 1);
}

function FlowSlideLandscape() {
  const topX = (i: number) => nodeX(i, TOP_NODES.length);
  const stepWidth = topX(1) - topX(0);
  const botX = (i: number) => topX(FORK_INDEX) + i * stepWidth;
  const forkX = topX(FORK_INDEX);

  return (
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
            y={-22}
            textAnchor="middle"
            fontSize="16"
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
            y={28}
            textAnchor="middle"
            fontSize="16"
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
          x={-80}
          y={-16}
          width={160}
          height={32}
          rx={16}
          fill="var(--color-background)"
          stroke="var(--color-accent-500)"
          strokeWidth="2"
        />
        <text
          textAnchor="middle"
          y={5}
          fontSize="16"
          fill="var(--color-accent-500)"
          fontWeight={500}
        >
          follow-up message
        </text>
      </g>
    </svg>
  );
}

// Portrait (vertical) layout
const PORT_VB_W = 320;
const PORT_VB_H = 720;
const PORT_TOP_X = 80;
const PORT_BOT_X = 240;
const PORT_Y_START = 60;
const PORT_TOP_SPACING = 90;
const PORT_BOT_SPACING = 60;

function FlowSlidePortrait() {
  const topY = (i: number) => PORT_Y_START + i * PORT_TOP_SPACING;
  const forkY = topY(FORK_INDEX);
  const botY = (i: number) => forkY + i * PORT_BOT_SPACING;

  return (
    <svg
      viewBox={`0 0 ${PORT_VB_W} ${PORT_VB_H}`}
      className="w-full h-auto max-h-[60svh]"
      aria-label="Eval Workflow with follow-up fork"
    >
      <line
        x1={PORT_TOP_X}
        y1={topY(0)}
        x2={PORT_TOP_X}
        y2={topY(TOP_NODES.length - 1)}
        stroke="rgba(20,20,20,0.16)"
        strokeWidth="1"
      />
      {TOP_NODES.map((label, i) => (
        <g key={`t${i}`} transform={`translate(${PORT_TOP_X}, ${topY(i)})`}>
          <circle
            r={NODE_R}
            fill={
              i === FORK_INDEX
                ? "var(--color-accent-500)"
                : "var(--color-text-primary)"
            }
          />
          <text
            x={-16}
            y={5}
            textAnchor="end"
            fontSize="18"
            fill="rgba(20,20,20,0.6)"
            fontWeight={500}
          >
            {label}
          </text>
        </g>
      ))}

      <line
        x1={PORT_BOT_X}
        y1={botY(0)}
        x2={PORT_BOT_X}
        y2={botY(BOT_NODES.length - 1)}
        stroke="rgba(20,20,20,0.16)"
        strokeWidth="1"
      />
      {BOT_NODES.map((label, i) => (
        <g key={`b${i}`} transform={`translate(${PORT_BOT_X}, ${botY(i)})`}>
          <circle
            r={NODE_R}
            fill={
              i === 0
                ? "var(--color-accent-500)"
                : "var(--color-text-primary)"
            }
          />
          <text
            x={16}
            y={5}
            textAnchor="start"
            fontSize="18"
            fill="rgba(20,20,20,0.6)"
            fontWeight={500}
          >
            {label}
          </text>
        </g>
      ))}

      <line
        x1={PORT_TOP_X + NODE_R + 4}
        y1={forkY}
        x2={PORT_BOT_X - NODE_R - 4}
        y2={forkY}
        stroke="var(--color-accent-500)"
        strokeWidth="1.25"
        strokeDasharray="3 3"
      />

      <g
        transform={`translate(${(PORT_TOP_X + PORT_BOT_X) / 2}, ${forkY - 22})`}
      >
        <rect
          x={-72}
          y={-14}
          width={144}
          height={28}
          rx={14}
          fill="var(--color-background)"
          stroke="var(--color-accent-500)"
          strokeWidth="2"
        />
        <text
          textAnchor="middle"
          y={5}
          fontSize="14"
          fill="var(--color-accent-500)"
          fontWeight={500}
        >
          follow-up message
        </text>
      </g>
    </svg>
  );
}

export function FlowSlide() {
  const isPortrait = useOrientation() === "portrait";

  return (
    <div className={`flex flex-col ${isPortrait ? "gap-6" : "gap-10"}`}>
      <div className="w-full max-w-content">
        {isPortrait ? <FlowSlidePortrait /> : <FlowSlideLandscape />}
      </div>

      <div
        className={`text-(--color-text-secondary) max-w-content w-full ${
          isPortrait ? "text-base" : "text-base"
        }`}
      >
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

"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

const NODE_R = 20;
const SLACK_SIZE = 36;
const ROW_Y = 110;
const VB_H = 220;

const SPACING = 130;
const S0 = 80;
const S1 = S0 + SPACING;
const S2 = S0 + SPACING * 2;
const S3 = S0 + SPACING * 3;
const S4 = S0 + SPACING * 4;
const S5 = S0 + SPACING * 5;
const VB_W = S5 + NODE_R + 40;

const captions = [
  "With evals in place, we head to Braintrust to see how the agent is performing.",
  "Reading every trace isn't sustainable. Fire a Slack alert when feedback turns negative — with prototype + user context, enough to start investigating.",
  "Better: do the investigative work before I'm pinged. Dog-food Reforge's Synthetic Users — browser agents that probe the prototype and figure out what went wrong — and bundle the findings into the Slack alert.",
  "Where we're going: file a Linear ticket with the eval score and the synthetic-user findings. Our coding agent picks up tickets and opens a PR on GitHub. I'm not pinged until it's time to review the solution.",
];

function GitHubLogo({ size = 24 }: { size?: number }) {
  const offset = -size / 2;
  const scale = size / 24;
  return (
    <g transform={`translate(${offset}, ${offset}) scale(${scale})`}>
      <path
        fill="#181717"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </g>
  );
}

function SlackLogo({ size = 24 }: { size?: number }) {
  const offset = -size / 2;
  const scale = size / 24;
  return (
    <g transform={`translate(${offset}, ${offset}) scale(${scale})`}>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </g>
  );
}

function NodeLabel({
  text,
  position = "top",
}: {
  text: string;
  position?: "top" | "bottom";
}) {
  return (
    <text
      y={position === "top" ? -NODE_R - 14 : NODE_R + 18}
      textAnchor="middle"
      fontSize="12"
      fill="rgba(20,20,20,0.6)"
      fontWeight={500}
    >
      {text}
    </text>
  );
}

function ImageNode({ href }: { href: string }) {
  return (
    <image
      href={href}
      x={-NODE_R}
      y={-NODE_R}
      width={NODE_R * 2}
      height={NODE_R * 2}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

function HiltNode() {
  const R = NODE_R * 1.6;
  return (
    <svg
      x={-R}
      y={-R}
      width={R * 2}
      height={R * 2}
      viewBox="450 700 2100 2100"
      preserveAspectRatio="xMidYMid slice"
      overflow="hidden"
    >
      <image href="/hilt.png" x="0" y="0" width="3041" height="4055" />
    </svg>
  );
}

function AgentNode() {
  return (
    <path
      d="M0 -11 L2.5 -2.5 L11 0 L2.5 2.5 L0 11 L-2.5 2.5 L-11 0 L-2.5 -2.5 Z"
      fill="var(--color-text-primary)"
    />
  );
}

export function ActionsSlide({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const showSlack = step === 1 || step === 2;
  const showReforge = step >= 2;
  const showTicketFlow = step >= 3;

  const slackX = step >= 2 ? S2 : S1;
  const hiltX =
    step >= 3 ? S5 : step >= 2 ? S3 : step >= 1 ? S2 : S1;

  const motionTransition = {
    duration: reduceMotion ? 0 : 0.5,
    ease: EASE_OUT,
  };

  const connectorTransition = {
    duration: reduceMotion ? 0 : 0.4,
    ease: EASE_OUT,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-prose w-full min-h-[5em]">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="text-sm md:text-base text-(--color-text-secondary) font-medium leading-relaxed"
          >
            {captions[step] ?? captions[0]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-content">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto"
          aria-label="Actions triggered by evals"
        >
          <line
            x1={S0 + NODE_R + 4}
            y1={ROW_Y}
            x2={S1 - NODE_R - 4}
            y2={ROW_Y}
            stroke="rgba(20,20,20,0.16)"
            strokeWidth="1"
          />

          {[
            { x1: S1, x2: S2, show: step >= 1 },
            { x1: S2, x2: S3, show: step >= 2 },
            { x1: S3, x2: S4, show: step >= 3 },
            { x1: S4, x2: S5, show: step >= 3 },
          ].map((c, i) => (
            <motion.line
              key={i}
              x1={c.x1 + NODE_R + 4}
              y1={ROW_Y}
              x2={c.x2 - NODE_R - 4}
              y2={ROW_Y}
              stroke="rgba(20,20,20,0.16)"
              strokeWidth="1"
              initial={false}
              animate={{
                pathLength: c.show ? 1 : 0,
                opacity: c.show ? 1 : 0,
              }}
              transition={connectorTransition}
            />
          ))}

          <g transform={`translate(${S0}, ${ROW_Y})`}>
            <ImageNode href="/braintrust.png" />
            <NodeLabel text="evals" position="top" />
          </g>

          <motion.g
            initial={false}
            animate={{
              x: S1,
              y: ROW_Y,
              opacity: showReforge ? 1 : 0,
            }}
            transition={{
              ...motionTransition,
              delay: showReforge && !reduceMotion ? 0.2 : 0,
            }}
          >
            <ImageNode href="/reforge.png" />
            <NodeLabel text="Synthetic Users" position="top" />
          </motion.g>

          <motion.g
            initial={false}
            animate={{
              x: slackX,
              y: ROW_Y,
              opacity: showSlack ? 1 : 0,
            }}
            transition={{
              ...motionTransition,
              delay: showSlack && step === 1 && !reduceMotion ? 0.2 : 0,
            }}
          >
            <SlackLogo size={SLACK_SIZE} />
            <NodeLabel text="alert" position="top" />
          </motion.g>

          <motion.g
            initial={false}
            animate={{
              x: S2,
              y: ROW_Y,
              opacity: showTicketFlow ? 1 : 0,
            }}
            transition={{
              ...motionTransition,
              delay: showTicketFlow && !reduceMotion ? 0.1 : 0,
            }}
          >
            <ImageNode href="/linear.png" />
            <NodeLabel text="Linear" position="top" />
          </motion.g>

          <motion.g
            initial={false}
            animate={{
              x: S3,
              y: ROW_Y,
              opacity: showTicketFlow ? 1 : 0,
            }}
            transition={{
              ...motionTransition,
              delay: showTicketFlow && !reduceMotion ? 0.25 : 0,
            }}
          >
            <AgentNode />
            <NodeLabel text="Agent" position="top" />
          </motion.g>

          <motion.g
            initial={false}
            animate={{
              x: S4,
              y: ROW_Y,
              opacity: showTicketFlow ? 1 : 0,
            }}
            transition={{
              ...motionTransition,
              delay: showTicketFlow && !reduceMotion ? 0.4 : 0,
            }}
          >
            <GitHubLogo size={SLACK_SIZE} />
            <NodeLabel text="GitHub" position="top" />
          </motion.g>

          <motion.g
            initial={false}
            animate={{ x: hiltX, y: ROW_Y }}
            transition={motionTransition}
          >
            <HiltNode />
            <NodeLabel text="HILT" position="top" />
          </motion.g>
        </svg>
      </div>
    </div>
  );
}

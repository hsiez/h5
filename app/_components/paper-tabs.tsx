"use client";

import { useState, useRef, useEffect, useId } from "react";
import type { PaperResult } from "@/lib/types";
import { AudioPlayer } from "@/app/_components/audio-player";
import { ExpandableText } from "@/app/_components/expandable-text";

const R = 16;
const CR = 12;
const SHADOW_PAD = 24;

interface Dims {
  width: number;
  height: number;
  tabs: Array<{ left: number; right: number; height: number }>;
}

function buildPath(
  dims: Dims,
  active: number,
  ox = 0,
  oy = 0,
): string {
  const { width: w, height: h, tabs } = dims;
  const tab = tabs[active];
  if (!tab) return "";
  const bt = tab.height;
  const r = R;
  const cr = Math.min(
    CR,
    tab.left > 0 ? tab.left : Infinity,
    w - tab.right,
  );

  const d: string[] = [];

  if (active === 0) {
    d.push(`M ${ox},${oy + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + r},${oy}`);
    d.push(`L ${ox + tab.right - r},${oy}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.right},${oy + r}`);
    d.push(`L ${ox + tab.right},${oy + bt - cr}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.right + cr},${oy + bt}`);
  } else {
    d.push(`M ${ox},${oy + bt + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + r},${oy + bt}`);
    d.push(`L ${ox + tab.left - cr},${oy + bt}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.left},${oy + bt - cr}`);
    d.push(`L ${ox + tab.left},${oy + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.left + r},${oy}`);
    d.push(`L ${ox + tab.right - r},${oy}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.right},${oy + r}`);
    d.push(`L ${ox + tab.right},${oy + bt - cr}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.right + cr},${oy + bt}`);
  }

  d.push(`L ${ox + w - r},${oy + bt}`);
  d.push(`A ${r},${r} 0 0,1 ${ox + w},${oy + bt + r}`);
  d.push(`L ${ox + w},${oy + h - r}`);
  d.push(`A ${r},${r} 0 0,1 ${ox + w - r},${oy + h}`);
  d.push(`L ${ox + r},${oy + h}`);
  d.push(`A ${r},${r} 0 0,1 ${ox},${oy + h - r}`);
  d.push(`Z`);

  return d.join(" ");
}

function buildHighlightPath(
  dims: Dims,
  active: number,
  ox = 0,
  oy = 0,
): string {
  const { width: w, tabs } = dims;
  const tab = tabs[active];
  if (!tab) return "";
  const bt = tab.height;
  const r = R;
  const cr = Math.min(
    CR,
    tab.left > 0 ? tab.left : Infinity,
    w - tab.right,
  );

  const d: string[] = [];

  if (active === 0) {
    d.push(`M ${ox},${oy + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + r},${oy}`);
    d.push(`L ${ox + tab.right - r},${oy}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.right},${oy + r}`);
    d.push(`L ${ox + tab.right},${oy + bt - cr}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.right + cr},${oy + bt}`);
  } else {
    d.push(`M ${ox},${oy + bt + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + r},${oy + bt}`);
    d.push(`L ${ox + tab.left - cr},${oy + bt}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.left},${oy + bt - cr}`);
    d.push(`L ${ox + tab.left},${oy + r}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.left + r},${oy}`);
    d.push(`L ${ox + tab.right - r},${oy}`);
    d.push(`A ${r},${r} 0 0,1 ${ox + tab.right},${oy + r}`);
    d.push(`L ${ox + tab.right},${oy + bt - cr}`);
    d.push(`A ${cr},${cr} 0 0,0 ${ox + tab.right + cr},${oy + bt}`);
  }

  d.push(`L ${ox + w - r},${oy + bt}`);
  d.push(`A ${r},${r} 0 0,1 ${ox + w},${oy + bt + r}`);

  return d.join(" ");
}

export function PaperTabs({
  papers,
  date,
  className,
}: {
  papers: PaperResult[];
  date: string;
  className?: string;
}) {
  const ids = useId();
  const shadowId = `${ids}-shadow`;
  const clipId = `${ids}-clip`;
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [dims, setDims] = useState<Dims | null>(null);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const tabs = tabRefs.current.map((el) => {
        if (!el) return { left: 0, right: 0, height: 0 };
        const r = el.getBoundingClientRect();
        return {
          left: r.left - cRect.left,
          right: r.right - cRect.left,
          height: r.height,
        };
      });
      setDims({ width: cRect.width, height: cRect.height, tabs });
    }

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [active]);

  const paper = papers[active];
  const pad = SHADOW_PAD;
  const svgW = dims ? dims.width + pad * 2 : 0;
  const svgH = dims ? dims.height + pad * 2 : 0;
  const mainPath = dims ? buildPath(dims, active, pad, pad) : "";
  const insetDims = dims
    ? {
        ...dims,
        width: dims.width - 2,
        height: dims.height - 2,
        tabs: dims.tabs.map((t) => ({
          left: t.left - 1,
          right: t.right + 1,
          height: t.height - 1,
        })),
      }
    : null;
  const highlightPath = insetDims
    ? buildHighlightPath(insetDims, active, pad + 1, pad + 1)
    : "";
  const insetClipPath = insetDims
    ? buildPath(insetDims, active, pad + 1, pad + 1)
    : "";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {dims && (
        <svg
          className="absolute pointer-events-none"
          style={{
            left: -pad,
            top: -pad,
            width: svgW,
            height: svgH,
          }}
          viewBox={`0 0 ${svgW} ${svgH}`}
        >
          <defs>
            <filter
              id={shadowId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              {/* Layer 1: 0 4px 8px -2px rgba(20,20,20,0.06) */}
              <feMorphology in="SourceAlpha" operator="erode" radius="2" result="shrink1" />
              <feGaussianBlur in="shrink1" stdDeviation="4" result="blur1" />
              <feOffset in="blur1" dy="4" result="off1" />
              <feColorMatrix
                in="off1"
                type="matrix"
                values="0 0 0 0 0.078  0 0 0 0 0.078  0 0 0 0 0.078  0 0 0 0.06 0"
                result="shadow1"
              />
              {/* Layer 2: 0 2px 4px -2px rgba(20,20,20,0.04) */}
              <feMorphology in="SourceAlpha" operator="erode" radius="2" result="shrink2" />
              <feGaussianBlur in="shrink2" stdDeviation="2" result="blur2" />
              <feOffset in="blur2" dy="2" result="off2" />
              <feColorMatrix
                in="off2"
                type="matrix"
                values="0 0 0 0 0.078  0 0 0 0 0.078  0 0 0 0 0.078  0 0 0 0.04 0"
                result="shadow2"
              />
              <feMerge>
                <feMergeNode in="shadow1" />
                <feMergeNode in="shadow2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id={clipId}>
              <path d={mainPath} />
            </clipPath>
            <clipPath id={`${clipId}-inner`}>
              <path d={insetClipPath} />
            </clipPath>
          </defs>
          {/* Shadow layer — blurred copy of the shape */}
          <path
            d={mainPath}
            fill="var(--color-surface-muted)"
            filter={`url(#${shadowId})`}
          />
          {/* Border — drawn inside via clip so curves stay uniform */}
          <path
            d={mainPath}
            fill="none"
            stroke="rgba(20,20,20,0.08)"
            strokeWidth="2"
            clipPath={`url(#${clipId})`}
          />
          {/* Top highlight — open path, clipped inside border */}
          <path
            d={highlightPath}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="4"
            strokeLinecap="round"
            clipPath={`url(#${clipId}-inner)`}
          />
        </svg>
      )}

      <div className="relative z-10">
        <div className="flex">
          {papers.map((p, i) => (
            <button
              key={p.arxivId}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 pt-2 pb-2.5 text-sm font-medium transition-colors ${
                i === active
                  ? "text-(--color-text-primary)"
                  : "text-(--color-text-tertiary) hover:text-(--color-text-secondary)"
              }`}
            >
              <span className="block max-w-32 truncate">
                {truncateTitle(p.title)}
              </span>
            </button>
          ))}
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <a
                href={`https://arxiv.org/abs/${paper.arxivId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-(--color-text-primary) underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary) leading-snug text-pretty"
              >
                {paper.title}
              </a>
              <span className="shrink-0 text-sm text-(--color-text-tertiary) tabular-nums pt-1">
                {paper.upvotes} &nbsp;&uarr;
              </span>
            </div>

            <p className="text-sm text-(--color-text-tertiary)">
              {paper.authors.slice(0, 4).join(", ")}
              {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
            </p>
          </div>

          <ExpandableText text={paper.abstract} className="pr-16" />

          <AudioPlayer src={`/api/papers/${date}/${paper.arxivId}/audio`} />
        </div>
      </div>
    </div>
  );
}

function truncateTitle(title: string): string {
  const first = title.split(/[:—–]/)[0].trim();
  if (first.length <= 28) return first;
  return first.slice(0, 26).trimEnd() + "…";
}

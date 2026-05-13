"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { GlossaryTerm } from "@/lib/types";

function splitIntoParagraphs(text: string): string[] {
  const explicit = text.split(/\n\s*\n/).filter((s) => s.trim());
  if (explicit.length > 1) return explicit.map((s) => s.trim());

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!sentences || sentences.length <= 3) return [text];

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(
      sentences
        .slice(i, i + 3)
        .join("")
        .trim(),
    );
  }
  return paragraphs;
}

function annotateToHtml(text: string, glossary: GlossaryTerm[]): string {
  if (glossary.length === 0) return text;

  const pattern = glossary
    .map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const heights = [60, 72, 85, 68, 92, 78, 100, 65];

  return text.replace(regex, (matched) => {
    const idx = glossary.findIndex(
      (t) => t.term.toLowerCase() === matched.toLowerCase(),
    );
    if (idx === -1) return matched;
    const h = heights[idx % heights.length];
    return `<span data-term-idx="${idx}" tabindex="0" class="term-highlight" aria-describedby="glossary-tooltip" style="background-size:100% ${h}%">${matched}</span>`;
  });
}

const HIGHLIGHT_STYLE = `
.term-highlight {
  cursor: help;
  border-radius: 2px;
  padding: 0 2px;
  margin: 0 -2px;
  background-image: linear-gradient(120deg, rgba(255,130,170,0.35) 0%, rgba(240,90,140,0.25) 100%);
  background-repeat: no-repeat;
  background-position: 0 85%;
}
`;

export function ExpandableText({
  text,
  expanded,
  glossary = [],
  className,
}: {
  text: string;
  expanded: boolean;
  glossary?: GlossaryTerm[];
  className?: string;
}) {
  const [clamped, setClamped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    term: GlossaryTerm;
    x: number;
    y: number;
    below: boolean;
  } | null>(null);

  const paragraphs = useMemo(() => splitIntoParagraphs(text), [text]);
  const paragraphsHtml = useMemo(
    () => paragraphs.map((p) => annotateToHtml(p, glossary)),
    [paragraphs, glossary],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const target = (e.target as HTMLElement).closest("[data-term-idx]");
      if (!target) {
        setTooltip(null);
        return;
      }
      const idx = Number(target.getAttribute("data-term-idx"));
      const term = glossary[idx];
      if (!term) return;
      const rect = target.getBoundingClientRect();
      const below = rect.top < 100;
      setTooltip({
        term,
        x: rect.left + rect.width / 2,
        y: below ? rect.bottom + 8 : rect.top - 8,
        below,
      });
    },
    [glossary],
  );

  const handlePointerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      const target = (e.target as HTMLElement).closest("[data-term-idx]");
      if (!target) return;
      const idx = Number(target.getAttribute("data-term-idx"));
      const term = glossary[idx];
      if (!term) return;
      const rect = target.getBoundingClientRect();
      const below = rect.top < 100;
      setTooltip({
        term,
        x: rect.left + rect.width / 2,
        y: below ? rect.bottom + 8 : rect.top - 8,
        below,
      });
    },
    [glossary],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || !related.closest("[data-term-idx]")) {
        setTooltip(null);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = (e.target as HTMLElement).closest("[data-term-idx]");
      if (!target) return;
      e.preventDefault();
      const idx = Number(target.getAttribute("data-term-idx"));
      const term = glossary[idx];
      if (!term) return;
      if (tooltip?.term === term) {
        setTooltip(null);
      } else {
        const rect = target.getBoundingClientRect();
        const below = rect.top < 100;
        setTooltip({
          term,
          x: rect.left + rect.width / 2,
          y: below ? rect.bottom + 8 : rect.top - 8,
          below,
        });
      }
    },
    [glossary, tooltip],
  );


  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_STYLE }} />
      <div
        ref={containerRef}
        className={`relative max-w-prose ${expanded ? "" : "line-clamp-3"}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        {paragraphsHtml.map((html, i) => (
          <p
            key={i}
            className={`font-serif text-base text-(--color-text-secondary) leading-loose ${i > 0 ? "mt-4" : ""}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
        {!expanded && clamped && (
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--color-surface-muted))",
            }}
          />
        )}
      </div>
      {tooltip && (
        <span
          id="glossary-tooltip"
          role="tooltip"
          className="fixed z-[9999] w-56 px-3 py-2 rounded-lg bg-(--color-text-primary) text-(--color-text-on-accent) text-xs leading-relaxed pointer-events-none -translate-x-1/2"
          style={{
            left: tooltip.x,
            top: tooltip.below ? tooltip.y : undefined,
            bottom: tooltip.below
              ? undefined
              : `calc(100vh - ${tooltip.y}px)`,
            boxShadow:
              "0 4px 12px -2px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          <span className="font-semibold">{tooltip.term.term}</span>
          <span className="mx-1">—</span>
          <span>{tooltip.term.definition}</span>
        </span>
      )}
    </div>
  );
}

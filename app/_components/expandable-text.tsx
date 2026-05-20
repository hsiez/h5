"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function annotateAllParagraphs(paragraphs: string[], glossary: GlossaryTerm[]): string[] {
  if (glossary.length === 0) return paragraphs;

  const pattern = glossary
    .map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const heights = [60, 72, 85, 68, 92, 78, 100, 65];
  const seen = new Set<number>();

  return paragraphs.map((text) =>
    text.replace(regex, (matched) => {
      const idx = glossary.findIndex(
        (t) => t.term.toLowerCase() === matched.toLowerCase(),
      );
      if (idx === -1 || seen.has(idx)) return matched;
      seen.add(idx);
      const h = heights[idx % heights.length];
      return `<span data-term-idx="${idx}" tabindex="0" class="term-highlight" aria-describedby="glossary-tooltip" style="background-size:100% ${h}%">${matched}</span>`;
    }),
  );
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
  definitionStyle = "tooltip",
  className,
}: {
  text: string;
  expanded: boolean;
  glossary?: GlossaryTerm[];
  definitionStyle?: "tooltip" | "bottom-panel";
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
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);

  const paragraphs = useMemo(() => splitIntoParagraphs(text), [text]);
  const paragraphsHtml = useMemo(
    () => annotateAllParagraphs(paragraphs, glossary),
    [paragraphs, glossary],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (definitionStyle === "bottom-panel") return;
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
    [glossary, definitionStyle],
  );

  const handlePointerLeave = useCallback(() => {
    if (definitionStyle === "bottom-panel") return;
    setTooltip(null);
  }, [definitionStyle]);

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      if (definitionStyle === "bottom-panel") return;
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
    [glossary, definitionStyle],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (definitionStyle === "bottom-panel") return;
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || !related.closest("[data-term-idx]")) {
        setTooltip(null);
      }
    },
    [definitionStyle],
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

      if (definitionStyle === "bottom-panel") {
        setActiveTerm((prev) => (prev === term ? null : term));
      } else {
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
      }
    },
    [glossary, tooltip, definitionStyle],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (definitionStyle !== "bottom-panel") return;
      const target = (e.target as HTMLElement).closest("[data-term-idx]");
      if (!target) {
        setActiveTerm(null);
        return;
      }
      const idx = Number(target.getAttribute("data-term-idx"));
      const term = glossary[idx];
      if (!term) return;
      setActiveTerm((prev) => (prev === term ? null : term));
    },
    [glossary, definitionStyle],
  );

  return (
    <div className={className} role="presentation">
      <style dangerouslySetInnerHTML={{ __html: HIGHLIGHT_STYLE }} />
      <div
        ref={containerRef}
        role="presentation"
        className={`relative max-w-prose ${expanded ? "" : "line-clamp-3"}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <div
          role="region"
          aria-label="Summary"
          className="font-serif text-base text-(--color-text-secondary) leading-loose"
          dangerouslySetInnerHTML={{
            __html: paragraphsHtml.join('<span class="block mt-4" aria-hidden="true"></span>'),
          }}
        />
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

      {definitionStyle === "tooltip" && tooltip && (
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

      <AnimatePresence>
        {definitionStyle === "bottom-panel" && activeTerm && (
          <motion.div
            key="definition-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none"
            style={{
              height: "40dvh",
              background:
                "linear-gradient(to bottom, transparent 0%, var(--color-surface-sunken) 40%)",
            }}
          >
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto px-6 pb-6">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={activeTerm.term}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-serif text-base leading-relaxed text-(--color-text-secondary)"
                >
                  <span className="font-semibold text-(--color-text-primary)">{activeTerm.term}</span>
                  <span className="mx-1.5">—</span>
                  <span>{activeTerm.definition}</span>
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

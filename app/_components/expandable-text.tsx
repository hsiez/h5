"use client";

import { useState, useRef, useEffect, useMemo } from "react";

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

export function ExpandableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const paragraphs = useMemo(() => splitIntoParagraphs(text), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className={className}>
      <div
        ref={ref}
        className={expanded ? "" : "line-clamp-3"}
      >
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={`text-base text-(--color-text-secondary) leading-relaxed ${i > 0 ? "mt-4" : ""}`}
          >
            {p}
          </p>
        ))}
      </div>
      {clamped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-(--color-text-tertiary) hover:text-(--color-text-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500) rounded-sm"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

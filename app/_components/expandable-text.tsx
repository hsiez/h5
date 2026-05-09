"use client";

import { useRef, useEffect, useState, useMemo } from "react";

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
  expanded,
  className,
}: {
  text: string;
  expanded: boolean;
  className?: string;
}) {
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
        className={`relative max-w-prose ${expanded ? "" : "line-clamp-3"}`}
      >
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={`font-serif text-base text-(--color-text-secondary) leading-loose ${i > 0 ? "mt-4" : ""}`}
          >
            {p}
          </p>
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
    </div>
  );
}

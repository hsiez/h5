import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "@/app/_components/expandable-text";

export function PaperCard({
  paper,
  expanded,
  className,
}: {
  paper: PaperResult;
  expanded: boolean;
  className?: string;
}) {
  return (
    <article
      className={`flex flex-col gap-6 p-8 rounded-lg bg-(--color-surface-muted) shadow-[0_4px_8px_-2px_rgba(20,20,20,0.06),0_2px_4px_-2px_rgba(20,20,20,0.04),0_0_0_1px_rgba(20,20,20,0.04),inset_0_0_0_1px_rgba(255,255,255,1)] ${className ?? ""}`}
    >
      <div className="flex flex-col gap-2 max-w-prose">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-relaxed text-pretty">
            {paper.title}
          </h2>
          <span className="shrink-0 inline-flex items-center justify-center text-(--color-text-tertiary)">
            <svg viewBox="0 0 44 40" fill="currentColor" aria-hidden="true" className="w-8 h-8">
              <ellipse cx="4"  cy="20" rx="1.5" ry="6" />
              <ellipse cx="10" cy="20" rx="2"   ry="12" />
              <ellipse cx="16" cy="20" rx="2"   ry="17" />
              <ellipse cx="22" cy="20" rx="2"   ry="19" />
              <ellipse cx="28" cy="20" rx="2"   ry="17" />
              <ellipse cx="34" cy="20" rx="2"   ry="12" />
              <ellipse cx="40" cy="20" rx="1.5" ry="6" />
            </svg>
          </span>
        </div>

        <p className="font-serif text-sm text-(--color-text-tertiary)">
          {paper.authors.slice(0, 4).join(", ")}
          {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
        </p>
      </div>

      <ExpandableText text={paper.abstract} expanded={expanded} className="pr-16" />
    </article>
  );
}

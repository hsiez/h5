import type { PaperResult } from "@/lib/types";
import { AudioPlayer } from "@/app/_components/audio-player";
import { ExpandableText } from "@/app/_components/expandable-text";

export function PaperCard({
  paper,
  audioSrc,
  className,
}: {
  paper: PaperResult;
  audioSrc: string;
  className?: string;
}) {
  return (
    <article
      className={`flex flex-col gap-6 p-6 rounded-lg border border-(--color-border) bg-(--color-surface-muted) shadow-[0_4px_8px_-2px_rgba(20,20,20,0.06),0_2px_4px_-2px_rgba(20,20,20,0.04),inset_0_2px_0_rgba(255,255,255,0.6)] ${className ?? ""}`}
    >
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

      <AudioPlayer src={audioSrc} />

    </article>
  );
}

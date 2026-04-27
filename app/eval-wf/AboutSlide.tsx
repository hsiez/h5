"use client";

const PHOTO_SRC = "/about.jpg";

export function AboutSlide() {
  return (
    <div className="flex flex-row gap-10 items-start">
      <div className="shrink-0 rounded-2xl overflow-hidden bg-(--color-surface-muted) border border-(--color-border) shadow-md w-[280px] h-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO_SRC}
          alt="Harley Siezar"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-4 max-w-prose pt-2">
        <p className="text-xl">
          <span className="font-semibold text-(--color-text-primary)">
            Harley Siezar
          </span>
          <span className="font-normal text-(--color-text-tertiary)">
            {" "}
            AI Engineer
          </span>
        </p>
        <p className="text-base text-(--color-text-secondary) leading-relaxed">
          I work on{" "}
          <span className="text-(--color-text-primary) font-medium">
            Reforge Build
          </span>
          , a prototyping tool.
        </p>
        <div className="flex items-center gap-3 text-base pt-2">
          <a
            href="https://x.com/hadasie"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
          >
            @hadasie
          </a>
          <span className="text-(--color-text-tertiary)">·</span>
          <a
            href="https://h5.codes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
          >
            h5.codes
          </a>
        </div>
      </div>
    </div>
  );
}

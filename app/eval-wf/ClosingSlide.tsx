"use client";

const REFORGE_LOGO_SRC = "/reforge.svg";
const MIRO_LOGO_SRC = "/miro.svg";

export function ClosingSlide() {
  return (
    <div className="flex flex-col items-center justify-center gap-12 py-16">
      <div className="flex items-center gap-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={REFORGE_LOGO_SRC}
          alt="Reforge"
          className="h-10 w-auto"
        />
        <span className="text-base font-medium text-(--color-text-tertiary) select-none">
          Joins
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MIRO_LOGO_SRC}
          alt="Miro"
          className="h-14 w-auto"
        />
      </div>

      <a
        href="https://miro.com/ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-base font-medium text-(--color-text-primary)"
      >
        See what&apos;s next at{" "}
        <span className="underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)">
          miro.com/ai
        </span>
      </a>
    </div>
  );
}

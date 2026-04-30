import type { Metadata } from "next";

const PDF_SRC = "/resume-2026.pdf";

export const metadata: Metadata = {
  title: "Resume — Harley Siezar",
};

export default function Resume() {
  return (
    <main className="flex flex-1 flex-col bg-(--color-background)">
      <object
        data={PDF_SRC}
        type="application/pdf"
        className="hidden md:block flex-1 w-full min-h-[80vh]"
        aria-label="Harley Siezar resume"
      />
      <div className="md:hidden flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-base text-(--color-text-secondary)">
          PDFs don&apos;t preview reliably on mobile.
        </p>
        <div className="flex items-center gap-3 text-base">
          <a
            href={PDF_SRC}
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
          >
            Open
          </a>
          <span className="text-(--color-text-tertiary)">·</span>
          <a
            href={PDF_SRC}
            download="harley-siezar-resume.pdf"
            className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
          >
            Download
          </a>
        </div>
      </div>
    </main>
  );
}

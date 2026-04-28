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
        className="flex-1 w-full min-h-[80vh]"
        aria-label="Harley Siezar resume"
      >
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-base text-(--color-text-secondary)">
            Your browser can&apos;t display this PDF inline.
          </p>
          <a
            href={PDF_SRC}
            download="harley-siezar-resume.pdf"
            className="text-sm font-medium text-(--color-text-primary) underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
          >
            Download the resume
          </a>
        </div>
      </object>
    </main>
  );
}

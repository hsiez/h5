import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBlobJson, fetchPreviousDate } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";
import { PaperCarousel } from "@/app/_components/paper-carousel";
import { MobilePaperList } from "@/app/_components/mobile-paper-list";
import { EmailSignup } from "@/app/_components/email-signup";
import { InlineDate } from "@/app/_components/inline-date";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const title = `Calm Papers — ${date}`;
  const description = "Summaries of the top 5 research papers on HuggingFace";

  const image = "/og-papers.png";

  return {
    title,
    description,
    openGraph: { title, description, type: "article", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PapersDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const [index, previousDate] = await Promise.all([
    fetchBlobJson<DailyIndex>(`papers/${date}/index.json`),
    fetchPreviousDate(date),
  ]);

  if (!index) notFound();

  return (
    <main className="h-dvh overflow-y-auto snap-y snap-proximity bg-(--color-background)">
      <header
        className="flex flex-col justify-center px-6"
        style={{ height: "60dvh" }}
      >
        <div className="mx-auto w-full px-2 md:px-8" style={{ maxWidth: 800 }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
              Calm Papers
            </h1>
            <InlineDate date={date} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-base text-(--color-text-tertiary)">
              Top research papers on HuggingFace
            </p>
            <span className="text-xl text-(--color-text-tertiary) ml-1" style={{ opacity: 0.4 }}>·</span>
            <EmailSignup />
          </div>
        </div>
      </header>

      <section
        className="snap-start min-h-dvh flex flex-col items-center px-6 py-8"
      >
        <div className="w-full" style={{ maxWidth: 800 }}>
          <PaperCarousel papers={index.papers} date={date} previousDate={previousDate} className="hidden md:block" />
          <div className="md:hidden">
            <MobilePaperList papers={index.papers} date={date} />
          </div>
        </div>
      </section>
    </main>
  );
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

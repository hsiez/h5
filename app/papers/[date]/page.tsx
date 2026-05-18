import { notFound } from "next/navigation";
import { fetchBlobJson, fetchPreviousDate } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";
import { PaperCarousel } from "@/app/_components/paper-carousel";
import { MobilePaperList } from "@/app/_components/mobile-paper-list";
import { DateStamp } from "@/app/_components/date-stamp";

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
        <div className="mx-auto w-full flex items-end gap-8 pl-8" style={{ maxWidth: 800 }}>
          <DateStamp date={parseDate(date)} className="shrink-0" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
              Calm Papers
            </h1>
            <p className="mt-1 text-sm text-(--color-text-tertiary)">
              <span className="md:hidden">Top 5 research papers on 🤗</span>
              <span className="hidden md:inline">Summaries of the top 5 research papers on 🤗</span>
            </p>
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

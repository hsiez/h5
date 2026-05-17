import { notFound } from "next/navigation";
import { fetchBlobJson, fetchPreviousDate } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";
import { PaperCarousel } from "@/app/_components/paper-carousel";
import { MobilePaperList } from "@/app/_components/mobile-paper-list";

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
        <div className="mx-auto w-full pl-8" style={{ maxWidth: 800 }}>
          <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
            Calm Papers
          </h1>
          <p className="mt-2 text-sm text-(--color-text-tertiary)">
            Summaries of the top 5 research papers on 🤗
          </p>
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

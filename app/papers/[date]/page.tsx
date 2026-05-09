import { notFound } from "next/navigation";
import { fetchBlobJson } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";
import { PaperCarousel } from "@/app/_components/paper-carousel";

export default async function PapersDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const index = await fetchBlobJson<DailyIndex>(`papers/${date}/index.json`);

  if (!index) notFound();

  return (
    <main className="flex flex-1 flex-col items-center px-6 pt-32 pb-16 bg-(--color-background)">
      <div className="w-full max-w-reading flex flex-col gap-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-text-primary)">
            Top Rated Papers on 🤗
          </h1>
          <p className="text-sm text-(--color-text-tertiary)">
            {formatDate(date)}
          </p>
        </header>

        <PaperCarousel papers={index.papers} date={date} />
      </div>
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

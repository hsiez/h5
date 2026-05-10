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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-8 bg-(--color-background) min-h-dvh overflow-x-clip">
      <div className="flex flex-col gap-12" style={{ width: "min(100%, 640px)" }}>
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

import { notFound } from "next/navigation";
import { fetchBlobJson } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";
import { PaperCarousel } from "@/app/_components/paper-carousel";
import { MobilePaperList } from "@/app/_components/mobile-paper-list";

export default async function PapersDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const index = await fetchBlobJson<DailyIndex>(`papers/${date}/index.json`);

  if (!index) notFound();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8 bg-(--color-background) h-dvh overflow-hidden">
      <div className="flex flex-col gap-12" style={{ width: "min(100%, 800px)" }}>
        <PaperCarousel papers={index.papers} date={date} className="hidden md:block" />
        <div className="md:hidden">
          <MobilePaperList papers={index.papers} date={date} />
        </div>
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

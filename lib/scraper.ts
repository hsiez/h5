import type { HFDailyPaperItem, PaperInput } from "@/lib/types";

const HF_API_BASE = "https://huggingface.co/api/daily_papers";
const TOP_N = 5;

export async function fetchTopPapers(date: string): Promise<PaperInput[]> {
  "use step";

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "h5-daily-papers/1.0",
  };
  if (process.env.HF_TOKEN) {
    headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;
  }

  const res = await fetch(`${HF_API_BASE}?date=${date}`, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HF API returned ${res.status}: ${body}`);
  }

  const items: HFDailyPaperItem[] = await res.json();

  return items
    .sort((a, b) => b.paper.upvotes - a.paper.upvotes)
    .slice(0, TOP_N)
    .map((item) => ({
      arxivId: item.paper.id,
      title: item.paper.title,
      abstract: item.paper.summary,
      aiSummary: item.paper.ai_summary,
      authors: item.paper.authors.map((a) => a.name),
      upvotes: item.paper.upvotes,
      githubRepo: item.paper.githubRepo,
      githubStars: item.paper.githubStars,
    }));
}

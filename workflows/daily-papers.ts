import { fetchTopPapers } from "@/lib/scraper";
import { fetchPaperSource } from "@/lib/source";
import { rewritePaper } from "@/lib/rewriter";
import { generateAudio } from "@/lib/tts";
import { mp3Duration } from "@/lib/mp3-duration";
import { uploadAudio, uploadDailyIndex, uploadLatestPointer } from "@/lib/storage";
import type { PaperResult, DailyIndex } from "@/lib/types";

export async function dailyPapersWorkflow(date: string) {
  "use workflow";

  const papers = await fetchTopPapers(date);

  if (papers.length === 0) {
    return { date, status: "no_papers" as const };
  }

  const results: PaperResult[] = [];

  for (const paper of papers) {
    try {
      const source = await fetchPaperSource(paper.arxivId);
      const { script, glossary } = await rewritePaper(paper, source);
      const { audioUrl, audioDuration } = await generateAndUploadAudio(date, paper.arxivId, paper.title, script);

      results.push({
        arxivId: paper.arxivId,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        script,
        glossary,
        audioUrl,
        audioDuration,
        upvotes: paper.upvotes,
        githubRepo: paper.githubRepo,
        githubStars: paper.githubStars,
      });
    } catch (error) {
      console.error(`Failed to process paper ${paper.arxivId}:`, error);
    }
  }

  if (results.length === 0) {
    return { date, status: "all_failed" as const };
  }

  const index: DailyIndex = {
    date,
    generatedAt: new Date().toISOString(),
    papers: results,
  };

  const indexUrl = await writeIndex(date, index);
  await writeLatestPointer(date);

  return { date, status: "ok" as const, count: results.length, indexUrl };
}

async function generateAndUploadAudio(
  date: string,
  arxivId: string,
  title: string,
  script: string,
): Promise<{ audioUrl: string; audioDuration: number }> {
  "use step";
  const mp3 = await generateAudio(script);
  const audioDuration = Math.round(mp3Duration(mp3));
  const audioUrl = await uploadAudio(date, arxivId, mp3);
  return { audioUrl, audioDuration };
}

async function writeIndex(date: string, index: DailyIndex): Promise<string> {
  "use step";
  return uploadDailyIndex(date, index);
}

async function writeLatestPointer(date: string): Promise<string> {
  "use step";
  return uploadLatestPointer(date);
}

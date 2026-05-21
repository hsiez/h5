import { fetchSinglePaper } from "@/lib/scraper";
import { fetchPaperSource } from "@/lib/source";
import { rewritePaper } from "@/lib/rewriter";
import { generateAudio } from "@/lib/tts";
import { mp3Duration } from "@/lib/mp3-duration";
import { uploadAudio, uploadDailyIndex, fetchBlobJson } from "@/lib/storage";
import type { PaperResult, DailyIndex } from "@/lib/types";

export async function singlePaperWorkflow(arxivId: string, date: string) {
  "use workflow";

  const paper = await fetchSinglePaper(arxivId);
  const source = await fetchPaperSource(arxivId);
  const { script, glossary } = await rewrite(paper, source);
  const { audioUrl, audioDuration } = await generateAndUpload(date, arxivId, paper.title, script);

  const result: PaperResult = {
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
  };

  await mergeIntoIndex(date, result);

  return { date, arxivId, status: "ok" as const, title: paper.title };
}

async function rewrite(
  paper: Awaited<ReturnType<typeof fetchSinglePaper>>,
  source: Awaited<ReturnType<typeof fetchPaperSource>>,
) {
  "use step";
  return rewritePaper(paper, source);
}

async function generateAndUpload(
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

async function mergeIntoIndex(date: string, result: PaperResult): Promise<void> {
  "use step";
  const existing = await fetchBlobJson<DailyIndex>(`papers/${date}/index.json`);

  let papers: PaperResult[];
  if (existing) {
    papers = existing.papers.filter((p) => p.arxivId !== result.arxivId);
    papers.push(result);
  } else {
    papers = [result];
  }

  const index: DailyIndex = {
    date,
    generatedAt: new Date().toISOString(),
    papers,
  };

  await uploadDailyIndex(date, index);
}

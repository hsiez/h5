export interface HFDailyPaperItem {
  paper: {
    id: string;
    title: string;
    summary: string;
    upvotes: number;
    authors: Array<{ name: string }>;
    ai_summary: string;
    ai_keywords: string[];
    githubRepo?: string;
    githubStars?: number;
  };
  publishedAt: string;
  title: string;
  numComments: number;
}

export interface PaperInput {
  arxivId: string;
  title: string;
  abstract: string;
  aiSummary: string;
  authors: string[];
  upvotes: number;
  githubRepo?: string;
  githubStars?: number;
}

export interface PaperSource {
  texBody: string;
  bibEntries: string | null;
}

export interface PaperResult {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  script: string;
  audioUrl: string;
  upvotes: number;
  githubRepo?: string;
  githubStars?: number;
}

export interface DailyIndex {
  date: string;
  generatedAt: string;
  papers: PaperResult[];
}

export interface Env {
  DB: D1Database;
  EMAIL: SendEmail;
  WORKER_URL: string;
  SITE_URL: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
  API_SECRET: string;
  PAPERS_API_URL: string;
}

export interface Subscriber {
  id: number;
  email: string;
  status: "pending" | "active" | "unsubscribed";
  confirm_token: string;
  unsubscribe_token: string;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

export interface PaperResult {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  script: string;
  glossary: { term: string; definition: string }[];
  audioUrl: string;
  audioDuration?: number;
  upvotes: number;
  githubRepo?: string;
  githubStars?: number;
}

export interface DailyIndex {
  date: string;
  generatedAt: string;
  papers: PaperResult[];
}

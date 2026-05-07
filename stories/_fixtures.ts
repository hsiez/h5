import type { PaperResult, DailyIndex } from "@/lib/types";

export const MOCK_PAPER: PaperResult = {
  arxivId: "2405.12345",
  title:
    "Scaling Sparse Autoencoders to GPT-4 Level Language Models",
  authors: [
    "Jane Smith",
    "Alex Chen",
    "Maria Garcia",
    "David Kim",
    "Sarah Johnson",
  ],
  abstract:
    "We present a method for training sparse autoencoders (SAEs) that scales to frontier language models. Our approach identifies interpretable features in GPT-4 class models, revealing structure in how these models represent concepts. We find that feature geometry becomes increasingly organized at scale, with clear clusters corresponding to semantic categories. The resulting dictionary of 32,000 features provides a new lens for understanding model behavior and enables targeted interventions for alignment research.",
  script:
    "Today's top paper tackles one of the biggest mysteries in AI — what's actually going on inside large language models. The researchers trained what's called a sparse autoencoder on a GPT-4 class model, essentially building a dictionary of the concepts the model has learned. They found over thirty-two thousand interpretable features, organized into neat semantic clusters. This is a big deal for AI safety because it means we might actually be able to understand and steer these models from the inside.",
  audioUrl: "",
  upvotes: 142,
  githubRepo: "openai/sparse-autoencoders",
  githubStars: 2340,
};

export const MOCK_PAPER_MINIMAL: PaperResult = {
  arxivId: "2405.67890",
  title: "On the Convergence of Adam with Weight Decay Regularization",
  authors: ["Loshchilov", "Hutter"],
  abstract:
    "We fix a longstanding bug in Adam when combined with L2 regularization and show that decoupled weight decay provides substantially better generalization across tasks.",
  script: "A short script about Adam optimizer fixes.",
  audioUrl: "",
  upvotes: 38,
};

export const MOCK_PAPER_LONG_TITLE: PaperResult = {
  arxivId: "2405.11111",
  title:
    "A Comprehensive Survey of Techniques for Improving Retrieval-Augmented Generation Systems: From Chunking Strategies to Reranking Architectures and Beyond",
  authors: [
    "Author One",
    "Author Two",
    "Author Three",
    "Author Four",
    "Author Five",
    "Author Six",
    "Author Seven",
  ],
  abstract:
    "This survey covers the rapidly evolving landscape of RAG systems, examining chunking, embedding, retrieval, reranking, and generation stages. We evaluate 47 recent methods across standardized benchmarks and identify key architectural patterns that consistently improve factual accuracy while reducing hallucination rates.",
  script: "A deep dive into the state of retrieval-augmented generation.",
  audioUrl: "",
  upvotes: 89,
  githubRepo: "awesome-rag/survey-2026",
  githubStars: 560,
};

export const MOCK_DAILY_INDEX: DailyIndex = {
  date: "2026-05-06",
  generatedAt: "2026-05-06T17:30:00.000Z",
  papers: [MOCK_PAPER, MOCK_PAPER_MINIMAL, MOCK_PAPER_LONG_TITLE],
};

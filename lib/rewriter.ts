import { generateText } from "ai";
import type { PaperInput, PaperSource } from "@/lib/types";

const DEFAULT_MODEL = "anthropic/claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a science communicator writing a 120–150 word spoken script for a daily AI research podcast. Your audience is technical but busy — they want the key insight, not a lecture.

Rules:
- Conversational tone, as if explaining to a smart colleague over coffee
- No jargon without a brief plain-language explanation
- No citations, URLs, or reference numbers
- No markdown formatting — output plain text only
- Start with what the paper does, then why it matters
- End with the most surprising or important result`;

export async function rewritePaper(
  paper: PaperInput,
  source: PaperSource,
): Promise<string> {
  "use step";

  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;

  const userPrompt = [
    `Title: ${paper.title}`,
    `Authors: ${paper.authors.join(", ")}`,
    "",
    "--- TeX Source ---",
    source.texBody,
    source.bibEntries ? `\n--- References ---\n${source.bibEntries}` : "",
  ].join("\n");

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return text;
}

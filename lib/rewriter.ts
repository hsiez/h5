import { generateText } from "ai";
import type { PaperInput, PaperSource, GlossaryTerm } from "@/lib/types";

const DEFAULT_MODEL = "anthropic/claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a science communicator writing a 120–150 word spoken script for a daily AI research podcast. Your audience is technical but busy — they want the key insight, not a lecture.

Rules:
- Conversational tone, as if explaining to a smart colleague over coffee
- No jargon without a brief plain-language explanation
- No citations, URLs, or reference numbers
- No markdown formatting — output plain text only
- Do NOT include the paper title — it is displayed separately
- Start with what the paper does, then why it matters
- End with the most surprising or important result
- Output ONLY the script itself — no preamble, no meta-commentary, no "Here is your script" or similar framing

After the script, output a JSON glossary of 3–6 terms from the script. Only include terms that meet AT LEAST ONE of these criteria:
- Acronyms or initialisms (e.g. "RLHF", "LoRA", "MoE")
- Named methods, architectures, or benchmarks introduced by the paper or its field (e.g. "FlashAttention", "MMLU")
- Domain-specific jargon that a software engineer outside ML would not know (e.g. "knowledge distillation", "speculative decoding")

Do NOT include:
- Common technical words any engineer knows (e.g. "model", "training", "dataset", "parameters", "optimization", "inference")
- Plain English words used in a slightly technical way (e.g. "scaling", "alignment", "fine-tuning")
- Words you already explained in plain language within the script

Each entry needs "term" (the exact word or phrase as it appears in the script) and "definition" (a plain-language definition, 10–20 words).

Format your response exactly as:
<script>
(your script here)
</script>
<glossary>
[{"term": "...", "definition": "..."}, ...]
</glossary>`;

export interface RewriteResult {
  script: string;
  glossary: GlossaryTerm[];
}

export async function rewritePaper(
  paper: PaperInput,
  source: PaperSource,
): Promise<RewriteResult> {
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

  return parseRewriteResponse(text);
}

function parseRewriteResponse(text: string): RewriteResult {
  const scriptMatch = text.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  const glossaryMatch = text.match(/<glossary>\s*([\s\S]*?)\s*<\/glossary>/);

  const script = scriptMatch ? scriptMatch[1].trim() : text.trim();

  let glossary: GlossaryTerm[] = [];
  if (glossaryMatch) {
    try {
      const parsed = JSON.parse(glossaryMatch[1].trim());
      if (Array.isArray(parsed)) {
        glossary = parsed.filter(
          (t: unknown): t is GlossaryTerm =>
            typeof t === "object" &&
            t !== null &&
            typeof (t as GlossaryTerm).term === "string" &&
            typeof (t as GlossaryTerm).definition === "string",
        );
      }
    } catch {
      // Malformed glossary — continue without it
    }
  }

  return { script, glossary };
}

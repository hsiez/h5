import { Readable } from "node:stream";
import { gunzipSync } from "node:zlib";
import tar from "tar-stream";
import type { PaperSource } from "@/lib/types";

const ARXIV_EPRINT = "https://arxiv.org/e-print";

export async function fetchPaperSource(
  arxivId: string,
): Promise<PaperSource> {
  "use step";

  const res = await fetch(`${ARXIV_EPRINT}/${arxivId}`);
  if (!res.ok) {
    throw new Error(`arXiv e-print returned ${res.status} for ${arxivId}`);
  }

  const gzipped = Buffer.from(await res.arrayBuffer());
  const decompressed = gunzipSync(gzipped);

  const files = await extractTar(decompressed);

  if (files.size === 0) {
    throw new Error(`No files extracted from arXiv source for ${arxivId}`);
  }

  const texBody = findMainTex(files);
  if (!texBody) {
    throw new Error(`No .tex file with \\documentclass found for ${arxivId}`);
  }

  const bibEntries = collectBib(files);

  return { texBody, bibEntries };
}

async function extractTar(
  data: Buffer,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const extract = tar.extract();

  return new Promise((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const name = header.name;
        if (name.endsWith(".tex") || name.endsWith(".bib")) {
          files.set(name, Buffer.concat(chunks).toString("utf-8"));
        }
        next();
      });
      stream.resume();
    });

    extract.on("finish", () => resolve(files));
    extract.on("error", reject);

    Readable.from(data).pipe(extract);
  });
}

function findMainTex(files: Map<string, string>): string | null {
  for (const [name, content] of files) {
    if (name.endsWith(".tex") && content.includes("\\documentclass")) {
      return content;
    }
  }
  return null;
}

function collectBib(files: Map<string, string>): string | null {
  const bibs: string[] = [];
  for (const [name, content] of files) {
    if (name.endsWith(".bib")) {
      bibs.push(content);
    }
  }
  return bibs.length > 0 ? bibs.join("\n\n") : null;
}

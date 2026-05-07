import { put, get } from "@vercel/blob";
import type { DailyIndex } from "@/lib/types";

export async function uploadAudio(
  date: string,
  arxivId: string,
  mp3: ArrayBuffer,
): Promise<string> {
  const blob = await put(`papers/${date}/${arxivId}.mp3`, mp3, {
    access: "private",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

export async function uploadDailyIndex(
  date: string,
  index: DailyIndex,
): Promise<string> {
  const blob = await put(
    `papers/${date}/index.json`,
    JSON.stringify(index),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
  return blob.url;
}

export async function uploadLatestPointer(date: string): Promise<string> {
  const blob = await put(
    "papers/latest.json",
    JSON.stringify({ date }),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
  return blob.url;
}

export async function fetchBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

export async function fetchBlobStream(
  pathname: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType };
}

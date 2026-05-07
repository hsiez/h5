import { put } from "@vercel/blob";
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

const DEFAULT_VOICE = "af_heart";

export async function generateAudio(text: string): Promise<ArrayBuffer> {
  const url = process.env.MODAL_TTS_URL;
  if (!url) {
    throw new Error("MODAL_TTS_URL is not set");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: DEFAULT_VOICE }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`TTS endpoint returned ${res.status}`);
  }

  return res.arrayBuffer();
}

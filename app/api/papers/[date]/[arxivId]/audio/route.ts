import { fetchBlobStream } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string; arxivId: string }> },
) {
  const { date, arxivId } = await params;
  const result = await fetchBlobStream(`papers/${date}/${arxivId}.mp3`);

  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

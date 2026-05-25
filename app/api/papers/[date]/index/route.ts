import { NextResponse } from "next/server";
import { fetchBlobJson } from "@/lib/storage";
import type { DailyIndex } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const index = await fetchBlobJson<DailyIndex>(`papers/${date}/index.json`);

  if (!index) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

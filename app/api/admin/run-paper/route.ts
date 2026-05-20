import { type NextRequest } from "next/server";
import { start } from "workflow/api";
import { singlePaperWorkflow } from "@/workflows/single-paper";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { arxivId, date } = body;

  if (!arxivId || typeof arxivId !== "string") {
    return Response.json({ error: "arxivId is required" }, { status: 400 });
  }

  const targetDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().slice(0, 10);

  const run = await start(singlePaperWorkflow, [arxivId, targetDate]);

  return Response.json({
    status: "started",
    runId: run.runId,
    arxivId,
    date: targetDate,
  });
}

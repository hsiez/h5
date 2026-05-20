import { type NextRequest } from "next/server";
import { start } from "workflow/api";
import { dailyPapersWorkflow } from "@/workflows/daily-papers";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const date = body.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date format (YYYY-MM-DD)" }, { status: 400 });
  }

  const run = await start(dailyPapersWorkflow, [date]);

  return Response.json({
    status: "started",
    runId: run.runId,
    date,
  });
}

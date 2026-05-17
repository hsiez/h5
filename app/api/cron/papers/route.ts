import { type NextRequest } from "next/server";
import { start } from "workflow/api";
import { dailyPapersWorkflow } from "@/workflows/daily-papers";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const date = request.nextUrl.searchParams.get("date") ?? yesterday;

  const run = await start(dailyPapersWorkflow, [date]);

  return Response.json({
    message: "Workflow started",
    runId: run.runId,
    date,
  });
}

import { type NextRequest } from "next/server";
import { start } from "workflow/api";
import { dailyPapersWorkflow } from "@/workflows/daily-papers";

export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const date =
    request.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);

  const run = await start(dailyPapersWorkflow, [date]);

  return Response.json({
    message: "Workflow started",
    runId: run.runId,
    date,
  });
}

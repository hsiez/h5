import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Subscriber, DailyIndex } from "./types";
import { confirmationEmail, digestEmail } from "./emails";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin,
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// ---------------------------------------------------------------------------
// POST /api/subscribe — double opt-in signup
// ---------------------------------------------------------------------------
app.post("/api/subscribe", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return c.json({ error: "Invalid email address" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id, status FROM subscribers WHERE email = ?"
  )
    .bind(email)
    .first<Pick<Subscriber, "id" | "status">>();

  if (existing?.status === "active") {
    return c.json({ message: "Already subscribed" });
  }

  const confirmToken = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();

  if (existing) {
    await c.env.DB.prepare(
      "UPDATE subscribers SET status = 'pending', confirm_token = ?, unsubscribe_token = ?, confirmed_at = NULL, unsubscribed_at = NULL WHERE id = ?"
    )
      .bind(confirmToken, unsubscribeToken, existing.id)
      .run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO subscribers (email, confirm_token, unsubscribe_token) VALUES (?, ?, ?)"
    )
      .bind(email, confirmToken, unsubscribeToken)
      .run();
  }

  const workerUrl = new URL(c.req.url).origin;
  const confirmUrl = `${workerUrl}/api/email/confirm?token=${confirmToken}`;
  const { html, text } = confirmationEmail(confirmUrl);

  await sendEmail(c.env, {
    to: email,
    subject: "Confirm your Calm Papers subscription",
    html,
    text,
  });

  return c.json({ message: "Check your email to confirm" });
});

// ---------------------------------------------------------------------------
// GET /api/email/confirm?token=xxx — confirm subscription
// ---------------------------------------------------------------------------
app.get("/api/email/confirm", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.text("Missing token", 400);

  const result = await c.env.DB.prepare(
    "UPDATE subscribers SET status = 'active', confirmed_at = datetime('now') WHERE confirm_token = ? AND status = 'pending'"
  )
    .bind(token)
    .run();

  if (!result.meta.changes) {
    return c.html(statusPage("Already confirmed", "You're already subscribed to Calm Papers.", c.env.SITE_URL));
  }

  return c.html(statusPage("You're in!", "You'll receive daily paper summaries starting tomorrow.", c.env.SITE_URL));
});

// ---------------------------------------------------------------------------
// GET /unsubscribe?token=xxx — one-click unsubscribe
// ---------------------------------------------------------------------------
app.get("/unsubscribe", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.text("Missing token", 400);

  await c.env.DB.prepare(
    "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE unsubscribe_token = ? AND status = 'active'"
  )
    .bind(token)
    .run();

  return c.html(statusPage("Unsubscribed", "You won't receive any more emails from Calm Papers.", c.env.SITE_URL));
});

// ---------------------------------------------------------------------------
// POST /api/send-digest — triggered by cron or manual call (requires API_SECRET)
// ---------------------------------------------------------------------------
app.post("/api/send-digest", async (c) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${c.env.API_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const count = await sendDailyDigest(c.env);
  return c.json({ sent: count });
});

// ---------------------------------------------------------------------------
// Scheduled handler (cron trigger)
// ---------------------------------------------------------------------------
async function scheduled(env: Env): Promise<void> {
  await sendDailyDigest(env);
}

async function sendDailyDigest(env: Env): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  let index: DailyIndex | null = null;
  try {
    const res = await fetch(`${env.PAPERS_API_URL}/api/papers/${today}/index`);
    if (res.ok) {
      index = await res.json();
    }
  } catch {
    // Fallback: try yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    try {
      const res = await fetch(`${env.PAPERS_API_URL}/api/papers/${yesterday}/index`);
      if (res.ok) index = await res.json();
    } catch {
      return 0;
    }
  }

  if (!index || !index.papers.length) return 0;

  const subscribers = await env.DB.prepare(
    "SELECT email, unsubscribe_token FROM subscribers WHERE status = 'active'"
  )
    .all<Pick<Subscriber, "email" | "unsubscribe_token">>();

  if (!subscribers.results.length) return 0;

  const formattedDate = formatDateShort(index.date);
  let sent = 0;

  for (const sub of subscribers.results) {
    const unsubscribeUrl = `${env.WORKER_URL}/unsubscribe?token=${sub.unsubscribe_token}`;
    const { html, text } = digestEmail(index.papers, index.date, env.SITE_URL, unsubscribeUrl);

    try {
      await sendEmail(env, {
        to: sub.email,
        subject: `Calm Papers — ${formattedDate}`,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send to ${sub.email}:`, err);
    }
  }

  return sent;
}

// ---------------------------------------------------------------------------
// Email sending via Cloudflare Email Service binding
// ---------------------------------------------------------------------------
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

async function sendEmail(env: Env, opts: EmailOptions): Promise<void> {
  await env.EMAIL.send({
    to: opts.to,
    from: { email: env.FROM_EMAIL, name: env.FROM_NAME },
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    ...(opts.headers && { headers: opts.headers }),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusPage(title: string, message: string, siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Calm Papers</title>
  <style>
    body {
      margin: 0; padding: 48px 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fff; color: #141414;
      display: flex; justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      max-width: 400px; text-align: center;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 24px; font-weight: 600;
      margin: 0 0 12px;
    }
    p { font-size: 16px; line-height: 1.5; color: #4f4f4f; margin: 0 0 32px; }
    a {
      display: inline-block; padding: 12px 24px;
      background: #2563eb; color: #fff;
      font-size: 14px; font-weight: 500;
      text-decoration: none; border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${siteUrl}/papers">Browse today's papers</a>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(scheduled(env));
  },
};

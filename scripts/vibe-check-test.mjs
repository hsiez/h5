import { chromium } from "playwright";

const args = process.argv.slice(2);
const TARGET_URL =
  args.find((arg) => !arg.startsWith("--")) ||
  process.env.VIBE_CHECK_URL ||
  "http://localhost:3002/vibe-check";
const mode = args.includes("--browserbase") ? "browserbase" : "local";
const headed = args.includes("--headed");

async function launchLocal() {
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  return { browser, page, label: headed ? "Local (headed)" : "Local (headless)" };
}

async function launchBrowserbase() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error(
      "Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID env vars.\n" +
        "Example: BROWSERBASE_API_KEY=xxx BROWSERBASE_PROJECT_ID=yyy node scripts/vibe-check-test.mjs --browserbase",
    );
    process.exit(1);
  }

  const res = await fetch("https://api.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "x-bb-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Browserbase session creation failed (${res.status}): ${body}`);
    process.exit(1);
  }

  const session = await res.json();
  const wsUrl = `wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${session.id}`;

  console.log(`Browserbase session: ${session.id}`);
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.newPage());
  return { browser, page, label: "Browserbase" };
}

async function run() {
  const { browser, page, label } =
    mode === "browserbase" ? await launchBrowserbase() : await launchLocal();

  console.log(`\nRunner: ${label}`);
  console.log(`Target: ${TARGET_URL}\n`);

  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await completeBehaviorChallenge(page);
  await page.waitForSelector("#vibe-result", { state: "attached", timeout: 30000 });

  const json = await page.$eval("#vibe-result", (el) => el.textContent);
  const scorecard = JSON.parse(json);

  console.log("=== Vibe Check Results ===\n");
  console.log(`Composite: ${scorecard.composite}/100`);
  console.log(`Verdict:   ${scorecard.verdict}`);
  console.log(`UA:        ${scorecard.userAgent.slice(0, 80)}`);

  for (const layer of scorecard.layers) {
    console.log(`\n--- ${layer.name} (${layer.score}/100) ---`);
    for (const sig of layer.signals) {
      const icon = sig.score >= 80 ? "✓" : sig.score >= 40 ? "~" : "✗";
      const val =
        typeof sig.rawValue === "object"
          ? JSON.stringify(sig.rawValue)
          : String(sig.rawValue ?? "—");
      console.log(
        `  ${icon} ${sig.id.padEnd(24)} ${String(sig.score).padStart(3)}/100  ${sig.detail || val}`,
      );
    }
  }

  console.log("\n=== Full JSON ===\n");
  console.log(JSON.stringify(scorecard, null, 2));

  await browser.close();
}

async function completeBehaviorChallenge(page) {
  const area = page.locator("[data-vibe-challenge-area]");
  const marker = page.locator("[data-vibe-challenge-marker]");

  await area.waitFor({ state: "visible", timeout: 30000 });
  await marker.waitFor({ state: "visible", timeout: 30000 });
  await marker.scrollIntoViewIfNeeded();

  const areaBox = await area.boundingBox();
  const markerBox = await marker.boundingBox();
  if (!areaBox || !markerBox) {
    throw new Error("Could not locate behavior challenge geometry");
  }

  const startX = markerBox.x + markerBox.width / 2;
  const startY = markerBox.y + markerBox.height / 2;
  const gates = [
    { x: areaBox.x + areaBox.width * 0.34, y: areaBox.y + areaBox.height * 0.42 },
    { x: areaBox.x + areaBox.width * 0.56, y: areaBox.y + areaBox.height * 0.66 },
    { x: areaBox.x + areaBox.width * 0.78, y: areaBox.y + areaBox.height * 0.34 },
  ];

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  let current = { x: startX, y: startY };
  for (const gate of gates) {
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      const x = current.x + (gate.x - current.x) * ease;
      const y = current.y + (gate.y - current.y) * ease;
      await page.mouse.move(x, y);
      await page.waitForTimeout(18 + (i % 4) * 7);
    }
    current = gate;
  }

  for (let i = 0; i < 12; i++) {
    await page.mouse.move(current.x, current.y);
    await page.waitForTimeout(85);
  }
  await page.mouse.up();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

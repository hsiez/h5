// A friendly cousin of lib/vibe-check. Same browser surfaces (timezone, WebGL
// renderer, user agent, touch), read not to score a visitor but to say a warm
// hello. Everything here is synchronous, client-only, and fails soft to null —
// a missing signal just drops a line from the greeting.

export interface VisitorGuess {
  /** "good morning" / "good evening" / "still up", from the local clock. */
  greeting: string;
  /** Friendly place name pulled from the IANA timezone, e.g. "Lisbon". */
  place: string | null;
  /** Visitor shares Harley's Pacific timezone — worth a wink. */
  sharesTimezone: boolean;
  /** Short, relatable device label, e.g. "Apple M2", "iPhone", "Mac". */
  device: string | null;
  /** Browser name, e.g. "Chrome", "Safari". */
  browser: string | null;
}

// Harley is in Seattle.
const HARLEY_TIMEZONE = "America/Los_Angeles";

function timeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "good morning";
  if (hour >= 12 && hour < 17) return "good afternoon";
  if (hour >= 17 && hour < 22) return "good evening";
  return "still up";
}

function placeFromTimezone(tz: string | undefined): string | null {
  if (!tz || tz === "UTC" || !tz.includes("/")) return null;
  // "America/Argentina/Buenos_Aires" -> "Buenos Aires"
  const city = tz.split("/").pop();
  if (!city) return null;
  return city.replace(/_/g, " ");
}

function readTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

// Same WEBGL_debug_renderer_info surface the vibe-check fingerprint layer reads,
// distilled into a short, human label instead of a hash.
function deviceFromWebGL(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return null;

    const renderer = String(
      gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "",
    );

    const apple = renderer.match(/Apple\s+M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
    if (apple) return apple[0].replace(/\s+/g, " ");
    if (/Apple/i.test(renderer)) return "Apple silicon";

    const nvidia = renderer.match(/(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}\s*(?:Ti|Super)?/i);
    if (nvidia) return nvidia[0].replace(/\s+/g, " ").trim();

    const radeon = renderer.match(/Radeon[^,)]*/i);
    if (radeon) return radeon[0].trim().slice(0, 28);

    if (/Intel/i.test(renderer)) return "Intel graphics";

    return null;
  } catch {
    return null;
  }
}

function deviceFromUA(ua: string, platform: string): string | null {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Mac/i.test(ua) || /mac/i.test(platform)) return "Mac";
  if (/Windows/i.test(ua) || /win/i.test(platform)) return "Windows PC";
  if (/Linux/i.test(ua) || /linux/i.test(platform)) return "Linux box";
  return null;
}

function browserName(ua: string): string | null {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return null;
}

export function detectVisitor(): VisitorGuess {
  const tz = readTimezone();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform =
    typeof navigator !== "undefined" ? navigator.platform ?? "" : "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

  return {
    greeting: timeGreeting(new Date().getHours()),
    place: placeFromTimezone(tz),
    sharesTimezone: tz === HARLEY_TIMEZONE,
    // On phones/tablets a device name beats a GPU string; on desktop the GPU
    // is the more personal, surprising detail.
    device: isMobile
      ? deviceFromUA(ua, platform)
      : deviceFromWebGL() ?? deviceFromUA(ua, platform),
    browser: browserName(ua),
  };
}

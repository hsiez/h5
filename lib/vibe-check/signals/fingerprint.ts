import type { SignalDefinition, SignalResult } from "../types";

function ok(id: string, rawValue: unknown, detail?: string): SignalResult {
  return { id, rawValue, score: 100, detail, status: "complete" };
}

function fail(
  id: string,
  rawValue: unknown,
  score: number,
  detail: string,
): SignalResult {
  return { id, rawValue, score, detail, status: "complete" };
}

function err(id: string, detail: string): SignalResult {
  return { id, rawValue: null, score: 50, detail, status: "error" };
}

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseOSFromUA(ua: string): string {
  if (/Mac/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad/i.test(ua)) return "ios";
  return "unknown";
}

export const fingerprintSignals: SignalDefinition[] = [
  {
    id: "canvas_fp",
    name: "Canvas fingerprint",
    description:
      "Renders text and shapes to a canvas element and hashes the output",
    category: "fingerprint",
    layer: 2,
    weight: 0.12,
    collect: () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return err("canvas_fp", "Could not get 2d context");

        ctx.fillStyle = "#f0e68c";
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = "#069";
        ctx.font = "14px Arial";
        ctx.fillText("Vibe Check canvas fingerprint 🎨", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillRect(75, 1, 100, 20);
        ctx.strokeStyle = "#8b4513";
        ctx.beginPath();
        ctx.arc(50, 40, 18, 0, Math.PI * 2);
        ctx.stroke();

        const data = canvas.toDataURL();
        const hash = djb2(data);

        if (data.length < 100)
          return fail("canvas_fp", hash, 20, "Canvas output is trivially small");
        return ok("canvas_fp", hash, `Hash: ${hash}`);
      } catch {
        return err("canvas_fp", "Canvas rendering failed");
      }
    },
  },
  {
    id: "webgl_renderer",
    name: "WebGL renderer",
    description: "Reads the unmasked GPU renderer and vendor strings",
    category: "fingerprint",
    layer: 2,
    weight: 0.12,
    collect: () => {
      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        if (!gl) return err("webgl_renderer", "WebGL not available");

        const ext = (gl as WebGLRenderingContext).getExtension(
          "WEBGL_debug_renderer_info",
        );
        if (!ext)
          return fail(
            "webgl_renderer",
            null,
            40,
            "WEBGL_debug_renderer_info unavailable",
          );

        const glCtx = gl as WebGLRenderingContext;
        const renderer = glCtx.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        const vendor = glCtx.getParameter(ext.UNMASKED_VENDOR_WEBGL);

        const headlessRenderers = [
          "swiftshader",
          "llvmpipe",
          "mesa",
          "softpipe",
          "software",
          "microsoft basic render",
        ];
        const rendererLower = (renderer || "").toLowerCase();
        const isHeadless = headlessRenderers.some((h) =>
          rendererLower.includes(h),
        );

        if (isHeadless)
          return fail(
            "webgl_renderer",
            { renderer, vendor },
            10,
            `Software renderer: ${renderer}`,
          );
        return ok(
          "webgl_renderer",
          { renderer, vendor },
          `GPU: ${renderer}`,
        );
      } catch {
        return err("webgl_renderer", "WebGL inspection failed");
      }
    },
  },
  {
    id: "webgl_params",
    name: "WebGL parameters",
    description: "Checks GPU capability parameters for emulation signals",
    category: "fingerprint",
    layer: 2,
    weight: 0.1,
    collect: () => {
      try {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl");
        if (!gl) return err("webgl_params", "WebGL not available");

        const glCtx = gl as WebGLRenderingContext;
        const maxTexture = glCtx.getParameter(glCtx.MAX_TEXTURE_SIZE);
        const maxRenderbuffer = glCtx.getParameter(
          glCtx.MAX_RENDERBUFFER_SIZE,
        );
        const maxViewport = glCtx.getParameter(glCtx.MAX_VIEWPORT_DIMS);
        const aliasedLineRange = glCtx.getParameter(
          glCtx.ALIASED_LINE_WIDTH_RANGE,
        );

        const params = {
          maxTexture,
          maxRenderbuffer,
          maxViewport: maxViewport
            ? [maxViewport[0], maxViewport[1]]
            : null,
          aliasedLineRange: aliasedLineRange
            ? [aliasedLineRange[0], aliasedLineRange[1]]
            : null,
        };

        let score = 100;
        const issues: string[] = [];

        if (maxTexture < 4096) {
          score -= 30;
          issues.push(`Low MAX_TEXTURE_SIZE: ${maxTexture}`);
        }
        if (maxRenderbuffer < 4096) {
          score -= 20;
          issues.push(`Low MAX_RENDERBUFFER_SIZE: ${maxRenderbuffer}`);
        }
        if (aliasedLineRange && aliasedLineRange[1] <= 1) {
          score -= 20;
          issues.push("ALIASED_LINE_WIDTH_RANGE max is 1");
        }

        if (issues.length > 0)
          return fail(
            "webgl_params",
            params,
            Math.max(0, score),
            issues.join("; "),
          );
        return ok("webgl_params", params, "GPU parameters within normal range");
      } catch {
        return err("webgl_params", "Could not read WebGL parameters");
      }
    },
  },
  {
    id: "audio_fp",
    name: "AudioContext fingerprint",
    description: "Generates an audio fingerprint via OfflineAudioContext",
    category: "fingerprint",
    layer: 2,
    weight: 0.1,
    collect: async () => {
      try {
        const ctx = new OfflineAudioContext(1, 44100, 44100);
        const oscillator = ctx.createOscillator();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(10000, ctx.currentTime);
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, ctx.currentTime);
        compressor.knee.setValueAtTime(40, ctx.currentTime);
        compressor.ratio.setValueAtTime(12, ctx.currentTime);
        compressor.attack.setValueAtTime(0, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);

        oscillator.connect(compressor);
        compressor.connect(ctx.destination);
        oscillator.start(0);

        const buffer = await ctx.startRendering();
        const data = buffer.getChannelData(0);

        let sum = 0;
        for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);

        const hash = djb2(sum.toString());
        if (sum === 0)
          return fail(
            "audio_fp",
            hash,
            20,
            "Audio output is silent (likely headless)",
          );
        return ok("audio_fp", hash, `Audio hash: ${hash}`);
      } catch {
        return err("audio_fp", "OfflineAudioContext unavailable");
      }
    },
  },
  {
    id: "font_enum",
    name: "Font enumeration",
    description: "Detects installed system fonts via width measurement",
    category: "fingerprint",
    layer: 2,
    weight: 0.08,
    collect: () => {
      try {
        const testFonts = [
          "Arial",
          "Verdana",
          "Times New Roman",
          "Georgia",
          "Courier New",
          "Trebuchet MS",
          "Impact",
          "Comic Sans MS",
          "Lucida Console",
          "Tahoma",
          "Palatino",
          "Garamond",
          "Bookman",
          "Avant Garde",
          "Helvetica",
          "Menlo",
          "Consolas",
          "Segoe UI",
          "SF Pro",
          "Roboto",
        ];

        const fallback = "monospace";
        const testString = "mmmmmmmmmmlli";
        const span = document.createElement("span");
        span.style.position = "absolute";
        span.style.left = "-9999px";
        span.style.fontSize = "72px";
        span.textContent = testString;
        document.body.appendChild(span);

        span.style.fontFamily = fallback;
        const fallbackWidth = span.offsetWidth;

        const detected: string[] = [];
        for (const font of testFonts) {
          span.style.fontFamily = `"${font}", ${fallback}`;
          if (span.offsetWidth !== fallbackWidth) detected.push(font);
        }

        document.body.removeChild(span);

        if (detected.length >= 5)
          return ok(
            "font_enum",
            detected,
            `${detected.length} fonts detected`,
          );
        if (detected.length > 0)
          return fail(
            "font_enum",
            detected,
            60,
            `Only ${detected.length} fonts detected`,
          );
        return fail(
          "font_enum",
          detected,
          20,
          "No distinctive fonts detected",
        );
      } catch {
        return err("font_enum", "Font enumeration failed");
      }
    },
  },
  {
    id: "screen_props",
    name: "Screen properties",
    description: "Checks screen dimensions, color depth, and pixel ratio",
    category: "fingerprint",
    layer: 2,
    weight: 0.08,
    collect: () => {
      try {
        const props = {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth,
          devicePixelRatio: window.devicePixelRatio,
        };

        let score = 100;
        const issues: string[] = [];

        if (props.colorDepth === 0) {
          score -= 40;
          issues.push("colorDepth is 0");
        }
        if (props.width === 0 || props.height === 0) {
          score -= 40;
          issues.push("Screen dimensions are 0");
        }
        if (props.devicePixelRatio === 0) {
          score -= 20;
          issues.push("devicePixelRatio is 0");
        }

        if (issues.length > 0)
          return fail(
            "screen_props",
            props,
            Math.max(0, score),
            issues.join("; "),
          );
        return ok(
          "screen_props",
          props,
          `${props.width}x${props.height} @ ${props.devicePixelRatio}x`,
        );
      } catch {
        return err("screen_props", "Could not read screen properties");
      }
    },
  },
  {
    id: "nav_props",
    name: "Navigator properties",
    description:
      "Collects platform, hardware concurrency, device memory, and languages",
    category: "fingerprint",
    layer: 2,
    weight: 0.08,
    collect: () => {
      try {
        const nav = navigator as Navigator & { deviceMemory?: number };
        const props = {
          platform: nav.platform,
          hardwareConcurrency: nav.hardwareConcurrency,
          deviceMemory: nav.deviceMemory ?? null,
          languages: [...nav.languages],
          maxTouchPoints: nav.maxTouchPoints,
        };

        let score = 100;
        const issues: string[] = [];

        if (!props.languages.length) {
          score -= 20;
          issues.push("Empty languages array");
        }
        if (props.hardwareConcurrency <= 0) {
          score -= 20;
          issues.push("Invalid hardwareConcurrency");
        }

        if (issues.length > 0)
          return fail(
            "nav_props",
            props,
            Math.max(0, score),
            issues.join("; "),
          );
        return ok(
          "nav_props",
          props,
          `${props.platform}, ${props.hardwareConcurrency} cores`,
        );
      } catch {
        return err("nav_props", "Could not read navigator properties");
      }
    },
  },
  {
    id: "intl_timezone",
    name: "Timezone",
    description: "Checks Intl.DateTimeFormat timezone for anomalies",
    category: "fingerprint",
    layer: 2,
    weight: 0.07,
    collect: () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz)
          return fail(
            "intl_timezone",
            null,
            30,
            "No timezone returned by Intl",
          );
        return ok("intl_timezone", tz, `Timezone: ${tz}`);
      } catch {
        return err("intl_timezone", "Intl.DateTimeFormat unavailable");
      }
    },
  },
  {
    id: "consistency_ua_canvas",
    name: "UA/Canvas/WebGL consistency",
    description:
      "Cross-references user agent OS with canvas and WebGL rendering signals",
    category: "fingerprint",
    layer: 2,
    weight: 0.1,
    collect: (prior) => {
      try {
        const ua = navigator.userAgent;
        const claimedOS = parseOSFromUA(ua);

        const webglResult = prior?.find((s) => s.id === "webgl_renderer");
        const renderer = (
          webglResult?.rawValue as { renderer?: string } | null
        )?.renderer;

        if (!renderer)
          return err(
            "consistency_ua_canvas",
            "No WebGL renderer data to cross-check",
          );

        const rendererLower = renderer.toLowerCase();
        let score = 100;
        const issues: string[] = [];

        if (
          claimedOS === "mac" &&
          (rendererLower.includes("mesa") ||
            rendererLower.includes("llvmpipe"))
        ) {
          score -= 50;
          issues.push(
            `UA claims macOS but renderer is Linux: ${renderer}`,
          );
        }
        if (
          claimedOS === "windows" &&
          rendererLower.includes("apple")
        ) {
          score -= 50;
          issues.push(
            `UA claims Windows but renderer is Apple: ${renderer}`,
          );
        }
        if (
          claimedOS === "linux" &&
          rendererLower.includes("apple")
        ) {
          score -= 50;
          issues.push(
            `UA claims Linux but renderer is Apple: ${renderer}`,
          );
        }
        if (rendererLower.includes("swiftshader")) {
          score -= 30;
          issues.push("SwiftShader is a software renderer");
        }

        if (issues.length > 0)
          return fail(
            "consistency_ua_canvas",
            { claimedOS, renderer },
            Math.max(0, score),
            issues.join("; "),
          );
        return ok(
          "consistency_ua_canvas",
          { claimedOS, renderer },
          `OS (${claimedOS}) consistent with GPU (${renderer.slice(0, 40)})`,
        );
      } catch {
        return err(
          "consistency_ua_canvas",
          "Could not perform cross-consistency check",
        );
      }
    },
  },
  {
    id: "consistency_hw",
    name: "Hardware consistency",
    description:
      "Cross-checks hardware concurrency, device memory, and touch points for plausibility",
    category: "fingerprint",
    layer: 2,
    weight: 0.15,
    collect: (prior) => {
      try {
        const navResult = prior?.find((s) => s.id === "nav_props");
        const props = navResult?.rawValue as {
          platform?: string;
          hardwareConcurrency?: number;
          deviceMemory?: number | null;
          maxTouchPoints?: number;
        } | null;

        if (!props)
          return err(
            "consistency_hw",
            "No navigator data for cross-check",
          );

        const cores = props.hardwareConcurrency ?? 0;
        const memory = props.deviceMemory ?? null;
        const touch = props.maxTouchPoints ?? 0;
        const platform = (props.platform ?? "").toLowerCase();

        let score = 100;
        const issues: string[] = [];

        if (cores > 0 && memory !== null) {
          if (cores >= 16 && memory <= 1) {
            score -= 30;
            issues.push(`${cores} cores but only ${memory}GB memory`);
          }
          if (cores <= 2 && memory !== null && memory >= 16) {
            score -= 20;
            issues.push(`Only ${cores} cores with ${memory}GB memory`);
          }
        }

        const isDesktopPlatform =
          platform.includes("win") ||
          platform.includes("mac") ||
          platform.includes("linux");
        if (isDesktopPlatform && touch > 5) {
          score -= 20;
          issues.push(
            `Desktop platform (${platform}) with ${touch} touch points`,
          );
        }

        if (cores === 0) {
          score -= 30;
          issues.push("hardwareConcurrency is 0");
        }

        if (issues.length > 0)
          return fail(
            "consistency_hw",
            { cores, memory, touch, platform },
            Math.max(0, score),
            issues.join("; "),
          );
        return ok(
          "consistency_hw",
          { cores, memory, touch, platform },
          `Hardware profile is plausible (${cores} cores)`,
        );
      } catch {
        return err(
          "consistency_hw",
          "Could not perform hardware consistency check",
        );
      }
    },
  },
];

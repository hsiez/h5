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

export const automationSignals: SignalDefinition[] = [
  {
    id: "nav_webdriver",
    name: "navigator.webdriver",
    description: "Detects the WebDriver automation flag",
    category: "automation",
    layer: 1,
    weight: 0.15,
    collect: () => {
      try {
        const value = navigator.webdriver;
        if (value === true)
          return fail(
            "nav_webdriver",
            true,
            0,
            "navigator.webdriver is true",
          );
        return ok("nav_webdriver", value, "navigator.webdriver is not set");
      } catch {
        return err("nav_webdriver", "Could not read navigator.webdriver");
      }
    },
  },
  {
    id: "chrome_obj",
    name: "window.chrome",
    description: "Checks for the Chrome browser object and sub-properties",
    category: "automation",
    layer: 1,
    weight: 0.1,
    collect: () => {
      try {
        const w = window as Record<string, unknown>;
        const chrome = w.chrome as Record<string, unknown> | undefined;
        if (!chrome)
          return fail("chrome_obj", false, 0, "window.chrome is missing");
        const hasRuntime = "runtime" in chrome;
        const hasApp = "app" in chrome;
        if (hasRuntime && hasApp)
          return ok(
            "chrome_obj",
            { runtime: hasRuntime, app: hasApp },
            "window.chrome looks real",
          );
        return fail(
          "chrome_obj",
          { runtime: hasRuntime, app: hasApp },
          40,
          "window.chrome exists but is incomplete",
        );
      } catch {
        return err("chrome_obj", "Could not inspect window.chrome");
      }
    },
  },
  {
    id: "cdp_bindings",
    name: "CDP bindings",
    description: "Checks for automation framework injected globals",
    category: "automation",
    layer: 1,
    weight: 0.15,
    collect: () => {
      const markers = [
        "__playwright_evaluation_script__",
        "__puppeteer_evaluation_script__",
        "__selenium_unwrapped",
        "__webdriver_evaluate",
        "__driver_evaluate",
        "__fxdriver_evaluate",
        "__webdriver_script_function",
        "calledSelenium",
        "_Selenium_IDE_Recorder",
        "_phantom",
        "__nightmare",
        "domAutomation",
        "domAutomationController",
      ];
      try {
        const w = window as Record<string, unknown>;
        const found = markers.filter((m) => m in w);
        if (found.length > 0)
          return fail(
            "cdp_bindings",
            found,
            0,
            `Detected: ${found.join(", ")}`,
          );
        return ok("cdp_bindings", [], "No automation bindings detected");
      } catch {
        return err("cdp_bindings", "Could not scan global scope");
      }
    },
  },
  {
    id: "nav_plugins",
    name: "navigator.plugins",
    description: "Checks if the browser has plugins installed",
    category: "automation",
    layer: 1,
    weight: 0.1,
    collect: () => {
      try {
        const count = navigator.plugins.length;
        if (count >= 3) return ok("nav_plugins", count, `${count} plugins`);
        if (count > 0)
          return fail("nav_plugins", count, 60, `Only ${count} plugin(s)`);
        return fail("nav_plugins", 0, 0, "No plugins (empty array)");
      } catch {
        return err("nav_plugins", "Could not read navigator.plugins");
      }
    },
  },
  {
    id: "nav_permissions",
    name: "Permissions API",
    description: "Queries notification permission for headless anomalies",
    category: "automation",
    layer: 1,
    weight: 0.08,
    collect: async () => {
      try {
        const result = await navigator.permissions.query({
          name: "notifications",
        });
        const state = result.state;
        if (state === "prompt")
          return ok("nav_permissions", state, "Notifications prompt (normal)");
        if (state === "denied")
          return fail(
            "nav_permissions",
            state,
            60,
            "Notifications denied (common in automation)",
          );
        return ok("nav_permissions", state, `Notifications: ${state}`);
      } catch {
        return err("nav_permissions", "Permissions API unavailable");
      }
    },
  },
  {
    id: "headless_ua",
    name: "Headless UA",
    description: "Checks for headless markers in the user agent string",
    category: "automation",
    layer: 1,
    weight: 0.08,
    collect: () => {
      try {
        const ua = navigator.userAgent;
        if (/HeadlessChrome/i.test(ua))
          return fail(
            "headless_ua",
            ua,
            0,
            "HeadlessChrome found in user agent",
          );
        if (/Headless/i.test(ua))
          return fail(
            "headless_ua",
            ua,
            10,
            "Headless marker found in user agent",
          );
        return ok("headless_ua", ua.slice(0, 80), "No headless markers in UA");
      } catch {
        return err("headless_ua", "Could not read user agent");
      }
    },
  },
  {
    id: "headless_dimensions",
    name: "Window dimensions",
    description: "Checks for zero outer dimensions typical of headless",
    category: "automation",
    layer: 1,
    weight: 0.07,
    collect: () => {
      try {
        const w = window.outerWidth;
        const h = window.outerHeight;
        if (w === 0 && h === 0)
          return fail(
            "headless_dimensions",
            { outerWidth: w, outerHeight: h },
            0,
            "Both outer dimensions are 0",
          );
        if (w === 0 || h === 0)
          return fail(
            "headless_dimensions",
            { outerWidth: w, outerHeight: h },
            30,
            "One outer dimension is 0",
          );
        return ok(
          "headless_dimensions",
          { outerWidth: w, outerHeight: h },
          "Window has real dimensions",
        );
      } catch {
        return err("headless_dimensions", "Could not read outer dimensions");
      }
    },
  },
  {
    id: "chrome_runtime",
    name: "chrome.runtime",
    description: "Inspects chrome.runtime behavior",
    category: "automation",
    layer: 1,
    weight: 0.07,
    collect: () => {
      try {
        const w = window as Record<string, unknown>;
        const chrome = w.chrome as Record<string, unknown> | undefined;
        if (!chrome || !("runtime" in chrome))
          return fail(
            "chrome_runtime",
            false,
            30,
            "chrome.runtime is missing",
          );
        const runtime = chrome.runtime as Record<string, unknown>;
        const hasId = "id" in runtime;
        if (hasId)
          return ok(
            "chrome_runtime",
            { hasId: true },
            "chrome.runtime.id exists (extension context)",
          );
        return ok(
          "chrome_runtime",
          { hasId: false },
          "chrome.runtime exists without id (normal page)",
        );
      } catch {
        return err("chrome_runtime", "Could not inspect chrome.runtime");
      }
    },
  },
  {
    id: "stack_trace_cdp",
    name: "Stack trace analysis",
    description: "Checks error stack traces for CDP injection patterns",
    category: "automation",
    layer: 1,
    weight: 0.1,
    collect: () => {
      try {
        const e = new Error("probe");
        const stack = e.stack || "";
        const cdpPatterns = [
          "__puppeteer_evaluation_script__",
          "__playwright_evaluation_script__",
          "evaluate@chrome",
          "Runtime.evaluate",
          "cdp",
        ];
        const found = cdpPatterns.filter((p) =>
          stack.toLowerCase().includes(p.toLowerCase()),
        );
        if (found.length > 0)
          return fail(
            "stack_trace_cdp",
            found,
            0,
            `CDP patterns in stack: ${found.join(", ")}`,
          );
        return ok("stack_trace_cdp", null, "No CDP patterns in stack trace");
      } catch {
        return err("stack_trace_cdp", "Could not analyze stack trace");
      }
    },
  },
  {
    id: "fn_tostring_lie",
    name: "Native function integrity",
    description:
      "Checks if native browser functions have been overridden via toString",
    category: "automation",
    layer: 1,
    weight: 0.1,
    collect: () => {
      try {
        const fns: Array<{ name: string; fn: unknown }> = [
          {
            name: "navigator.permissions.query",
            fn: navigator.permissions?.query,
          },
          {
            name: "document.createElement",
            fn: document.createElement,
          },
        ];

        const lies: string[] = [];
        for (const { name, fn } of fns) {
          if (typeof fn !== "function") continue;
          const str = Function.prototype.toString.call(fn);
          if (!str.includes("[native code]")) {
            lies.push(name);
          }
        }

        if (lies.length > 0)
          return fail(
            "fn_tostring_lie",
            lies,
            0,
            `Overridden: ${lies.join(", ")}`,
          );
        return ok(
          "fn_tostring_lie",
          null,
          "Native functions appear unmodified",
        );
      } catch {
        return err("fn_tostring_lie", "Could not perform toString checks");
      }
    },
  },
];

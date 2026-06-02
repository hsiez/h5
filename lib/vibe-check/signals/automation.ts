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

function claimsChromiumDesktop(): boolean {
  const ua = navigator.userAgent;
  const claimsChromium =
    /\b(?:Chrome|Chromium|Edg|OPR)\//i.test(ua) && !/\b(?:CriOS|FxiOS)\//i.test(ua);
  const isMobile = /Android|Mobile|iPhone|iPad|iPod/i.test(ua);
  return claimsChromium && !isMobile;
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
    description:
      "Checks whether Chromium-claiming desktop browsers expose window.chrome",
    category: "automation",
    layer: 1,
    weight: 0.06,
    collect: () => {
      try {
        const w = window as unknown as Record<string, unknown>;
        const chrome = w.chrome as Record<string, unknown> | undefined;
        const claimsChromium = claimsChromiumDesktop();
        if (!chrome && claimsChromium)
          return fail(
            "chrome_obj",
            { hasChromeObject: false, claimsChromium },
            20,
            "UA claims desktop Chromium but window.chrome is missing",
          );
        return ok(
          "chrome_obj",
          { hasChromeObject: Boolean(chrome), claimsChromium },
          chrome
            ? "window.chrome exists"
            : "Non-Chromium browser; window.chrome not expected",
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
        const w = window as unknown as Record<string, unknown>;
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
    description: "Soft check for plugin-list anomalies in Chromium browsers",
    category: "automation",
    layer: 1,
    weight: 0.03,
    collect: () => {
      try {
        const count = navigator.plugins.length;
        const claimsChromium = claimsChromiumDesktop();
        if (count === 0 && claimsChromium)
          return fail(
            "nav_plugins",
            { count, claimsChromium },
            70,
            "Empty plugin list in desktop Chromium-like browser",
          );
        return ok(
          "nav_plugins",
          { count, claimsChromium },
          `${count} plugin(s); plugin lists are weak modern signals`,
        );
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
        const notificationPermission =
          typeof Notification === "undefined"
            ? "unavailable"
            : Notification.permission;
        const normalizedNotification =
          notificationPermission === "default"
            ? "prompt"
            : notificationPermission;

        if (
          notificationPermission !== "unavailable" &&
          normalizedNotification !== state
        )
          return fail(
            "nav_permissions",
            { permissionsState: state, notificationPermission },
            50,
            "Permissions API and Notification.permission disagree",
          );
        return ok(
          "nav_permissions",
          { permissionsState: state, notificationPermission },
          `Notifications permission surfaces agree (${state})`,
        );
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
    weight: 0.03,
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
    id: "stack_trace_cdp",
    name: "Stack trace analysis",
    description: "Checks error stack traces for CDP injection patterns",
    category: "automation",
    layer: 1,
    weight: 0.04,
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
    id: "webdriver_descriptor",
    name: "WebDriver descriptor",
    description:
      "Checks whether navigator.webdriver has been patched as an own property",
    category: "automation",
    layer: 1,
    weight: 0.08,
    collect: () => {
      try {
        const own = Object.getOwnPropertyDescriptor(navigator, "webdriver");
        const proto = Object.getOwnPropertyDescriptor(
          Navigator.prototype,
          "webdriver",
        );
        const claimsChromium = claimsChromiumDesktop();
        const getterString =
          typeof proto?.get === "function"
            ? Function.prototype.toString.call(proto.get)
            : null;

        if (own)
          return fail(
            "webdriver_descriptor",
            {
              hasOwnDescriptor: true,
              hasPrototypeDescriptor: Boolean(proto),
              claimsChromium,
            },
            20,
            "navigator.webdriver is shadowed by an own property",
          );
        if (
          claimsChromium &&
          getterString !== null &&
          !getterString.includes("[native code]")
        )
          return fail(
            "webdriver_descriptor",
            {
              hasOwnDescriptor: false,
              hasPrototypeDescriptor: Boolean(proto),
              claimsChromium,
            },
            40,
            "navigator.webdriver getter does not look native",
          );
        return ok(
          "webdriver_descriptor",
          {
            hasOwnDescriptor: false,
            hasPrototypeDescriptor: Boolean(proto),
            claimsChromium,
          },
          proto
            ? "navigator.webdriver descriptor is on the prototype"
            : "navigator.webdriver descriptor not exposed in this browser",
        );
      } catch {
        return err(
          "webdriver_descriptor",
          "Could not inspect navigator.webdriver descriptor",
        );
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

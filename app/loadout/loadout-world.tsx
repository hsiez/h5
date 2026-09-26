"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import styles from "./loadout.module.css";

const DENSITY_STAGES = [3, 1] as const;
const MIN_PREVIEW_SCALE = 0.56;
const MAX_PREVIEW_SCALE = 5.4;
const ONE_LEVEL_STRENGTH = Math.log(1.055);
const TWO_LEVEL_STRENGTH = Math.log(1.3);

type RegionId = "edc" | "cooking" | "coming-soon";

type Region = {
  id: RegionId;
  name: string;
  note: string;
  items: string[];
};

type RegionMemory = Record<RegionId, { stage: number; scrollTop: number }>;
type GestureSource = "touch" | "wheel" | "safari";
type GesturePhase = "idle" | "tracking" | "locked";

type SafariGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

const REGION_DEFINITIONS: Array<Omit<Region, "items"> & { seed: string[] }> = [
  {
    id: "edc",
    name: "Everyday carry",
    note: "6 objects · active kit",
    seed: ["Belt", "Coat", "Hat", "Jeans", "Loafers", "Wallet"],
  },
  {
    id: "cooking",
    name: "Cooking",
    note: "6 objects · temporary kit",
    seed: ["Belt", "Coat", "Hat", "Jeans", "Loafers", "Wallet"],
  },
  {
    id: "coming-soon",
    name: "Coming soon",
    note: "New region in progress",
    seed: ["Reserved"],
  },
];

function buildItems(seed: string[], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const name = seed[index % seed.length];
    const cycle = Math.floor(index / seed.length);
    return cycle === 0 ? name : `${name} ${cycle + 1}`;
  });
}

const REGIONS: Region[] = REGION_DEFINITIONS.map((region, index) => ({
  ...region,
  items: buildItems(region.seed, [6, 6, 9][index]),
}));

const EDC_IMAGES: Record<string, string> = {
  Belt: "/loadout/belt.png",
  Coat: "/loadout/coat-v2.png",
  Hat: "/loadout/hat.png",
  Jeans: "/loadout/pants-v2.png",
  Loafers: "/loadout/shoes.png",
  Wallet: "/loadout/wallet-v4.png",
};

const GRAPHITE_IMAGES: Record<string, string> = {
  Belt: "/loadout/belt-graphite-v2.png",
  Coat: "/loadout/coat-graphite-v2.png",
  Hat: "/loadout/hat-graphite-v2.png",
  Jeans: "/loadout/jeans-graphite-v2.png",
  Loafers: "/loadout/loafers-graphite-v2.png",
  Wallet: "/loadout/wallet-graphite-v2.png",
};

const ITEM_BRANDS: Record<string, string> = {
  Belt: "Arcade",
  Coat: "Kapital",
  Jeans: "Oni",
  Hat: "Reforge",
  Wallet: "Coach",
  Loafers: "Aurora",
};

const ITEM_LABELS: Record<string, string> = {
  Hat: "Cap",
};

const ITEM_PRESENTATION: Record<string, { scale: number; x: string; y: string }> = {
  Belt: { scale: 1.08, x: "0%", y: "0%" },
  Coat: { scale: 1.05, x: "0%", y: "2%" },
  Hat: { scale: 1.14, x: "0%", y: "1%" },
  Jeans: { scale: 1.1, x: "0%", y: "-1%" },
  Loafers: { scale: 1.14, x: "0%", y: "0%" },
  Wallet: { scale: 1.2, x: "0%", y: "0%" },
};

const INITIAL_MEMORY = Object.fromEntries(
  REGIONS.map((region) => [region.id, { stage: 0, scrollTop: 0 }]),
) as RegionMemory;

function itemSlug(item: string) {
  return item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function writeLoadoutUrl(
  regionId: RegionId | null,
  itemIndex?: number | null,
  replace = false,
) {
  const url = new URL(window.location.href);
  url.search = "";

  if (!regionId) {
    url.searchParams.set("view", "world");
  } else {
    url.searchParams.set("region", regionId);
    const region = REGIONS.find((candidate) => candidate.id === regionId);
    const item = itemIndex === undefined || itemIndex === null
      ? null
      : region?.items[itemIndex];
    if (item) url.searchParams.set("item", itemSlug(item));
  }

  window.history[replace ? "replaceState" : "pushState"](
    {},
    "",
    `${url.pathname}${url.search}`,
  );
}

function distance(a: PointerEvent | ReactPointerEvent, b: PointerEvent | ReactPointerEvent) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function LoadoutWorld() {
  const [activeRegionId, setActiveRegionId] = useState<RegionId | null>("edc");
  const [stage, setStage] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isDensityTransitioning, setIsDensityTransitioning] = useState(false);
  const [memory, setMemory] = useState<RegionMemory>(INITIAL_MEMORY);
  const [isPinching, setIsPinching] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { clientX: number; clientY: number }>());
  const gesture = useRef({ startDistance: 0, startScale: 1, x: 0, y: 0 });
  const gestureSession = useRef<{
    phase: GesturePhase;
    source: GestureSource | null;
    targetRegion: RegionId | null;
    targetItemIndex: number | null;
  }>({ phase: "idle", source: null, targetRegion: null, targetItemIndex: null });
  const gestureUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);
  const pendingScale = useRef(1);
  const rawScale = useRef(1);
  const focusedWheelDelta = useRef(0);
  const focusedWheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedNavigationLocked = useRef(false);
  const focusedSwipe = useRef<{
    pointerId: number;
    startY: number;
    currentY: number;
  } | null>(null);
  const reducedMotion = useReducedMotion();

  const activeRegion = useMemo(
    () => REGIONS.find((region) => region.id === activeRegionId) ?? null,
    [activeRegionId],
  );

  const regionAtPoint = useCallback((x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-region-id]");
    return (target?.dataset.regionId as RegionId | undefined) ?? null;
  }, []);

  const constrainPreviewScale = useCallback((nextScale: number) => {
    let minimum = 0.86;
    let maximum = 1.6;

    if (activeRegionId) {
      const currentColumns = DENSITY_STAGES[stage];
      minimum = stage === 0
        ? 0.58
        : currentColumns / DENSITY_STAGES[stage - 1];
      maximum = stage === DENSITY_STAGES.length - 1
        ? 1.14
        : currentColumns / DENSITY_STAGES[stage + 1];
    }

    if (nextScale < minimum) {
      const overshoot = minimum * 0.06;
      return Math.max(
        MIN_PREVIEW_SCALE,
        minimum - overshoot * (1 - Math.exp(-(minimum - nextScale) / Math.max(minimum, 0.01))),
      );
    }
    if (nextScale > maximum) {
      const overshoot = maximum * 0.06;
      return Math.min(
        MAX_PREVIEW_SCALE,
        maximum + overshoot * (1 - Math.exp(-(nextScale - maximum) / Math.max(maximum, 0.01))),
      );
    }
    return nextScale;
  }, [activeRegionId, stage]);

  const applyPreviewScale = useCallback((nextScale: number, x: number, y: number) => {
    const surface = activeRegionId ? sheetRef.current : worldRef.current;
    if (!surface) return;

    pendingScale.current = constrainPreviewScale(nextScale);
    gesture.current.x = x;
    gesture.current.y = y;
    if (frame.current !== null) return;

    frame.current = requestAnimationFrame(() => {
      const scale = pendingScale.current;
      const surfaceRect = surface.getBoundingClientRect();
      surface.style.transformOrigin = `${gesture.current.x - surfaceRect.left}px ${gesture.current.y - surfaceRect.top}px`;
      surface.style.transform = `scale(${scale})`;
      frame.current = null;
    });
  }, [activeRegionId, constrainPreviewScale]);

  const visibleItems = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return [] as HTMLElement[];
    const overscan = window.innerHeight * 0.6;
    return Array.from(viewport.querySelectorAll<HTMLElement>("[data-item-id]"))
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.bottom > -overscan && rect.top < window.innerHeight + overscan;
      });
  }, []);

  const commitDensity = useCallback((targetStage: number, focalX?: number, focalY?: number) => {
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;
    if (!viewport || !sheet || targetStage === stage) {
      if (sheet) sheet.style.transform = "";
      setIsPinching(false);
      return;
    }

    const x = focalX ?? window.innerWidth / 2;
    const y = focalY ?? window.innerHeight / 2;
    const candidates = visibleItems();
    const anchor = candidates.reduce<HTMLElement | null>((best, item) => {
      const rect = item.getBoundingClientRect();
      const itemDistance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
      if (!best) return item;
      const bestRect = best.getBoundingClientRect();
      const bestDistance = Math.hypot(bestRect.left + bestRect.width / 2 - x, bestRect.top + bestRect.height / 2 - y);
      return itemDistance < bestDistance ? item : best;
    }, null);
    const anchorId = anchor?.dataset.itemId;
    const anchorIndex = Number(anchorId?.split("-").at(-1));
    const nextItemIndex = targetStage === 1 && Number.isFinite(anchorIndex)
      ? anchorIndex
      : activeItemIndex;

    sheet.style.transform = "";
    const update = () => {
      setIsDensityTransitioning(true);
      setActiveItemIndex(nextItemIndex);
      setStage(targetStage);
      window.scrollTo(0, 0);
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    if (reducedMotion || !transitionDocument.startViewTransition) {
      flushSync(update);
      requestAnimationFrame(() => setIsDensityTransitioning(false));
    } else {
      const transition = transitionDocument.startViewTransition(() => flushSync(update));
      transition.finished.then(
        () => setIsDensityTransitioning(false),
        () => setIsDensityTransitioning(false),
      );
    }

    if (activeRegionId) {
      writeLoadoutUrl(
        activeRegionId,
        targetStage === 1 ? nextItemIndex : null,
      );
    }

    setIsPinching(false);
  }, [activeItemIndex, activeRegionId, reducedMotion, stage, visibleItems]);

  const switchMode = useCallback((
    nextRegion: RegionId | null,
    targetStage?: number,
    targetItemIndex?: number | null,
    focalY?: number,
  ) => {
    const viewport = viewportRef.current;
    if (activeRegionId && viewport) {
      setMemory((current) => ({
        ...current,
        [activeRegionId]: { stage, scrollTop: window.scrollY },
      }));
    }

    const update = () => {
      if (nextRegion) {
        const remembered = memory[nextRegion];
        const nextStage = targetStage ?? remembered.stage;
        setActiveRegionId(nextRegion);
        setStage(nextStage);
        if (targetItemIndex !== undefined && targetItemIndex !== null) {
          setActiveItemIndex(targetItemIndex);
        }
        requestAnimationFrame(() => {
          if (targetItemIndex !== undefined && targetItemIndex !== null) {
            const item = viewportRef.current?.querySelector<HTMLElement>(
              `[data-item-id="${nextRegion}-${targetItemIndex}"]`,
            );
            if (item) {
              const rect = item.getBoundingClientRect();
              const landingY = focalY ?? window.innerHeight / 2;
              window.scrollBy(0, rect.top + rect.height / 2 - landingY);
              return;
            }
          }
          window.scrollTo(0, targetStage === undefined ? remembered.scrollTop : 0);
        });
        writeLoadoutUrl(
          nextRegion,
          nextStage === 1 ? targetItemIndex : null,
        );
      } else {
        setActiveRegionId(null);
        setStage(0);
        window.scrollTo(0, 0);
        writeLoadoutUrl(null);
      }
      setIsPinching(false);
    };

    const surface = activeRegionId ? sheetRef.current : worldRef.current;
    if (surface) surface.style.transform = "";

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (reducedMotion || !transitionDocument.startViewTransition) {
      flushSync(update);
    } else {
      transitionDocument.startViewTransition(() => flushSync(update));
    }
  }, [activeRegionId, memory, reducedMotion, stage]);

  const resetPreview = useCallback(() => {
    const surface = activeRegionId ? sheetRef.current : worldRef.current;
    if (surface) surface.style.transform = "";
    pendingScale.current = 1;
    rawScale.current = 1;
    setIsPinching(false);
  }, [activeRegionId]);

  const endGesture = useCallback((x: number, y: number) => {
    const signedStrength = Math.log(Math.max(rawScale.current, 0.001));
    const strength = Math.abs(signedStrength);
    const currentPosition = activeRegionId ? stage + 1 : 0;

    if (strength < ONE_LEVEL_STRENGTH) {
      resetPreview();
      return;
    }

    const levels = strength >= TWO_LEVEL_STRENGTH ? 2 : 1;
    const direction = signedStrength > 0 ? 1 : -1;
    const targetPosition = Math.max(0, Math.min(2, currentPosition + direction * levels));

    if (targetPosition === currentPosition) {
      resetPreview();
    } else if (targetPosition === 0) {
      switchMode(null);
    } else if (!activeRegionId) {
      switchMode(
        gestureSession.current.targetRegion ?? "edc",
        targetPosition - 1,
        targetPosition === 2 ? gestureSession.current.targetItemIndex : null,
        y,
      );
    } else {
      commitDensity(targetPosition - 1, x, y);
    }
  }, [activeRegionId, commitDensity, resetPreview, stage, switchMode]);

  const beginGesture = useCallback((source: GestureSource, x: number, y: number) => {
    const session = gestureSession.current;
    if (session.phase === "locked") return false;
    if (session.phase === "tracking") return session.source === source;

    session.phase = "tracking";
    session.source = source;
    session.targetRegion = activeRegionId ? null : regionAtPoint(x, y);
    const worldItem = activeRegionId
      ? null
      : document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-world-item-index]");
    session.targetItemIndex = worldItem
      ? Number(worldItem.dataset.worldItemIndex)
      : null;
    pendingScale.current = 1;
    rawScale.current = 1;
    gesture.current.x = x;
    gesture.current.y = y;
    setIsPinching(true);
    return true;
  }, [activeRegionId, regionAtPoint]);

  const lockGestureUntilQuiet = useCallback((delay = 320) => {
    gestureSession.current.phase = "locked";
    if (gestureUnlockTimer.current) clearTimeout(gestureUnlockTimer.current);
    gestureUnlockTimer.current = setTimeout(() => {
      gestureSession.current = {
        phase: "idle",
        source: null,
        targetRegion: null,
        targetItemIndex: null,
      };
    }, delay);
  }, []);

  const stepWheelZoom = useCallback((direction: 1 | -1, x: number, y: number) => {
    const currentPosition = activeRegionId ? stage + 1 : 0;
    const targetPosition = Math.max(0, Math.min(2, currentPosition + direction));

    if (targetPosition === currentPosition) {
      resetPreview();
    } else if (targetPosition === 0) {
      switchMode(null);
    } else if (!activeRegionId) {
      const targetRegion = gestureSession.current.targetRegion;
      if (!targetRegion || targetRegion === "coming-soon") {
        resetPreview();
        return;
      }
      switchMode(targetRegion, 0, null, y);
    } else {
      commitDensity(targetPosition - 1, x, y);
    }
  }, [activeRegionId, commitDensity, resetPreview, stage, switchMode]);

  const finishGesture = useCallback((source: GestureSource, x: number, y: number) => {
    const session = gestureSession.current;
    if (session.phase !== "tracking" || session.source !== source) return;

    const strength = Math.abs(Math.log(Math.max(rawScale.current, 0.001)));
    const commitsMove = strength >= ONE_LEVEL_STRENGTH;

    if (commitsMove) {
      lockGestureUntilQuiet();
    } else {
      session.phase = "idle";
      session.source = null;
      session.targetRegion = null;
      session.targetItemIndex = null;
    }

    endGesture(x, y);
  }, [endGesture, lockGestureUntilQuiet]);

  const cancelGesture = useCallback((source: GestureSource) => {
    if (gestureSession.current.source !== source) return;
    gestureSession.current = {
      phase: "idle",
      source: null,
      targetRegion: null,
      targetItemIndex: null,
    };
    resetPreview();
  }, [resetPreview]);

  const moveFocusedItem = useCallback((direction: 1 | -1) => {
    if (stage !== 1 || !activeRegion || focusedNavigationLocked.current) return;
    const nextIndex = Math.max(
      0,
      Math.min(activeRegion.items.length - 1, activeItemIndex + direction),
    );
    if (nextIndex === activeItemIndex) return;

    focusedNavigationLocked.current = true;
    setActiveItemIndex(nextIndex);
    writeLoadoutUrl(activeRegion.id, nextIndex, true);
    window.setTimeout(() => {
      focusedNavigationLocked.current = false;
    }, reducedMotion ? 80 : 520);
  }, [activeItemIndex, activeRegion, reducedMotion, stage]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;
    pointers.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (stage === 1 && pointers.current.size === 1) {
      focusedSwipe.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        currentY: event.clientY,
      };
    }
    if (pointers.current.size === 2) {
      focusedSwipe.current = null;
      const [a, b] = Array.from(pointers.current.values());
      const midpointX = (a.clientX + b.clientX) / 2;
      const midpointY = (a.clientY + b.clientY) / 2;
      if (!beginGesture("touch", midpointX, midpointY)) return;
      gesture.current = {
        startDistance: distance(a as PointerEvent, b as PointerEvent),
        startScale: 1,
        x: midpointX,
        y: midpointY,
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (focusedSwipe.current?.pointerId === event.pointerId) {
      focusedSwipe.current.currentY = event.clientY;
      if (Math.abs(event.clientY - focusedSwipe.current.startY) > 8) event.preventDefault();
    }
    if (pointers.current.size !== 2 || gestureSession.current.source !== "touch") return;
    event.preventDefault();
    const [a, b] = Array.from(pointers.current.values());
    const midpointX = (a.clientX + b.clientX) / 2;
    const midpointY = (a.clientY + b.clientY) / 2;
    const nextScale = gesture.current.startScale * distance(a as PointerEvent, b as PointerEvent) / gesture.current.startDistance;
    rawScale.current = nextScale;
    applyPreviewScale(nextScale, midpointX, midpointY);
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const wasPinching = pointers.current.size === 2;
    const swipe = focusedSwipe.current?.pointerId === event.pointerId
      ? focusedSwipe.current
      : null;
    pointers.current.delete(event.pointerId);
    focusedSwipe.current = null;
    if (wasPinching) {
      finishGesture("touch", gesture.current.x, gesture.current.y);
    } else if (swipe) {
      const delta = swipe.currentY - swipe.startY;
      if (Math.abs(delta) >= 48) moveFocusedItem(delta < 0 ? 1 : -1);
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    focusedSwipe.current = null;
    cancelGesture("touch");
  }

  const handleWheelInput = useCallback((event: WheelEvent) => {
    if (stage === 1 && !event.ctrlKey && !event.metaKey) {
      if (event.cancelable) event.preventDefault();
      focusedWheelDelta.current += event.deltaY;
      if (focusedWheelTimer.current) clearTimeout(focusedWheelTimer.current);
      focusedWheelTimer.current = setTimeout(() => {
        focusedWheelDelta.current = 0;
      }, 160);
      if (Math.abs(focusedWheelDelta.current) >= 42) {
        moveFocusedItem(focusedWheelDelta.current > 0 ? 1 : -1);
        focusedWheelDelta.current = 0;
      }
      return;
    }
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.cancelable) event.preventDefault();
    const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? event.deltaY * 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? event.deltaY * window.innerHeight
        : event.deltaY;

    if (gestureSession.current.phase === "locked") {
      lockGestureUntilQuiet(420);
      return;
    }
    if (!beginGesture("wheel", event.clientX, event.clientY)) return;

    lockGestureUntilQuiet(420);
    stepWheelZoom(normalizedDelta < 0 ? 1 : -1, event.clientX, event.clientY);
  }, [beginGesture, lockGestureUntilQuiet, moveFocusedItem, stage, stepWheelZoom]);

  const handleSafariStart = useCallback((event: SafariGestureEvent) => {
    if (event.cancelable) event.preventDefault();
    beginGesture("safari", event.clientX, event.clientY);
  }, [beginGesture]);

  const handleSafariChange = useCallback((event: SafariGestureEvent) => {
    if (event.cancelable) event.preventDefault();
    if (gestureSession.current.phase === "locked") {
      lockGestureUntilQuiet(420);
      return;
    }
    if (gestureSession.current.source !== "safari") return;
    if (event.scale === 1) return;
    lockGestureUntilQuiet(420);
    stepWheelZoom(event.scale > 1 ? 1 : -1, event.clientX, event.clientY);
  }, [lockGestureUntilQuiet, stepWheelZoom]);

  const handleSafariEnd = useCallback((event: SafariGestureEvent) => {
    if (event.cancelable) event.preventDefault();
    finishGesture("safari", gesture.current.x, gesture.current.y);
  }, [finishGesture]);

  useEffect(() => {
    const restoreFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "world") {
        setActiveRegionId(null);
        setStage(0);
        requestAnimationFrame(() => window.scrollTo(0, 0));
        return;
      }

      const requestedRegion = params.get("region");
      const region = REGIONS.find(
        (candidate) => candidate.id === requestedRegion && candidate.id !== "coming-soon",
      ) ?? REGIONS[0];
      const requestedItem = params.get("item");
      const itemIndex = requestedItem
        ? region.items.findIndex((item) => itemSlug(item) === requestedItem)
        : -1;

      setActiveRegionId(region.id);
      setStage(itemIndex >= 0 ? 1 : 0);
      setActiveItemIndex(itemIndex >= 0 ? itemIndex : 0);
      requestAnimationFrame(() => {
        if (itemIndex < 0) {
          window.scrollTo(0, 0);
          return;
        }
        const item = viewportRef.current?.querySelector<HTMLElement>(
          `[data-item-id="${region.id}-${itemIndex}"]`,
        );
        item?.scrollIntoView({ block: "center" });
      });
    };

    restoreFromUrl();
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  useEffect(() => {
    const onGestureStart = (event: Event) => handleSafariStart(event as SafariGestureEvent);
    const onGestureChange = (event: Event) => handleSafariChange(event as SafariGestureEvent);
    const onGestureEnd = (event: Event) => handleSafariEnd(event as SafariGestureEvent);

    window.addEventListener("wheel", handleWheelInput, { passive: false, capture: true });
    window.addEventListener("gesturestart", onGestureStart, { passive: false });
    window.addEventListener("gesturechange", onGestureChange, { passive: false });
    window.addEventListener("gestureend", onGestureEnd, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheelInput, { capture: true });
      window.removeEventListener("gesturestart", onGestureStart);
      window.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("gestureend", onGestureEnd);
    };
  }, [handleSafariChange, handleSafariEnd, handleSafariStart, handleWheelInput]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (gestureUnlockTimer.current) clearTimeout(gestureUnlockTimer.current);
    if (focusedWheelTimer.current) clearTimeout(focusedWheelTimer.current);
  }, []);

  const onViewportKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (stage !== 1 || !activeRegion) return;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveFocusedItem(1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveFocusedItem(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveItemIndex(0);
      writeLoadoutUrl(activeRegion.id, 0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      const lastIndex = activeRegion.items.length - 1;
      setActiveItemIndex(lastIndex);
      writeLoadoutUrl(activeRegion.id, lastIndex, true);
    }
  }, [activeRegion, moveFocusedItem, stage]);

  return (
    <main className={styles.page}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        data-mode={activeRegionId ? "region" : "world"}
        data-stage={stage}
        data-pinching={isPinching ? "true" : "false"}
        data-density-transitioning={isDensityTransitioning ? "true" : "false"}
        tabIndex={stage === 1 ? 0 : undefined}
        onKeyDown={onViewportKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
      >
        {activeRegion ? (
          <section
            className={styles.region}
            aria-label={`${activeRegion.name} items`}
          >
            <div
              ref={sheetRef}
              className={styles.sheet}
              style={{
                viewTransitionName: `region-${activeRegion.id}`,
              } as CSSProperties}
            >
              <div
                className={styles.itemLayout}
                style={{
                  "--columns": DENSITY_STAGES[stage],
                  "--active-item": activeItemIndex,
                } as CSSProperties}
              >
                {activeRegion.items.map((item, index) => {
                  const imageSrc = activeRegion.id !== "coming-soon" ? EDC_IMAGES[item] : undefined;
                  const presentation = ITEM_PRESENTATION[item];
                  return (
                    <button
                      key={`${activeRegion.id}-${index}`}
                      className={styles.item}
                      data-item-id={`${activeRegion.id}-${index}`}
                      data-active={index === activeItemIndex ? "true" : "false"}
                      tabIndex={stage === 1 && index !== activeItemIndex ? -1 : 0}
                      style={{
                        "--item-index": index,
                        "--item-scale": presentation?.scale ?? 1,
                        "--item-x": presentation?.x ?? "0%",
                        "--item-y": presentation?.y ?? "0%",
                      } as CSSProperties}
                      aria-label={`${item}, item ${index + 1} of ${activeRegion.items.length}`}
                      onClick={(event) => {
                        if (stage === 0) {
                          commitDensity(1, event.clientX, event.clientY);
                        } else {
                          writeLoadoutUrl(activeRegion.id, index);
                        }
                      }}
                    >
                      <span
                        className={styles.itemMedia}
                        data-has-image={imageSrc ? "true" : "false"}
                        aria-hidden="true"
                        style={{
                          viewTransitionName: `loadout-${activeRegion.id}-${index}`,
                        } as CSSProperties}
                      >
                        {imageSrc ? (
                          <>
                            <Image
                              src={imageSrc}
                              alt=""
                              fill
                              sizes="(min-width: 900px) 30vw, 45vw"
                              className={`${styles.itemImage} ${styles.itemPhoto}`}
                            />
                            <Image
                              src={GRAPHITE_IMAGES[item]}
                              alt=""
                              fill
                              unoptimized
                              aria-hidden="true"
                              className={`${styles.itemImage} ${styles.itemDither}`}
                            />
                          </>
                        ) : (
                          <span>{String(index + 1).padStart(2, "0")}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {stage === 1 ? (
                <p className={styles.focusedPosition} aria-live="polite">
                  {activeItemIndex + 1} / {activeRegion.items.length}
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <section ref={worldRef} className={styles.world} aria-label="Loadout regions">
            <div className={styles.worldGrid}>
              {REGIONS.map((region, regionIndex) => (
                <button
                  key={region.id}
                  className={styles.regionCard}
                  data-region-id={region.id}
                  disabled={region.id === "coming-soon"}
                  onClick={() => switchMode(region.id, 0)}
                >
                  <span className={styles.regionCardHeader}>
                    <strong>{region.name}</strong>
                    <span>{region.items.length}</span>
                  </span>
                  <span
                    className={styles.miniGrid}
                    aria-hidden="true"
                    style={{ viewTransitionName: `region-${region.id}` } as CSSProperties}
                  >
                    {region.items.slice(0, 9).map((item, index) => {
                      const imageSrc = region.id !== "coming-soon" ? EDC_IMAGES[item] : undefined;
                      const presentation = ITEM_PRESENTATION[item];
                      return (
                        <span
                          key={index}
                          data-world-item-index={index}
                          data-has-image={imageSrc ? "true" : "false"}
                          style={{
                            "--item-index": index + regionIndex * 7,
                            "--item-scale": presentation?.scale ?? 1,
                            "--item-x": presentation?.x ?? "0%",
                            "--item-y": presentation?.y ?? "0%",
                          } as CSSProperties}
                        >
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt=""
                              fill
                              sizes="(min-width: 900px) 12vw, 24vw"
                              className={styles.itemImage}
                            />
                          ) : String(index + 1).padStart(2, "0")}
                        </span>
                      );
                    })}
                  </span>
                  <span className={styles.regionNote}>{region.note}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

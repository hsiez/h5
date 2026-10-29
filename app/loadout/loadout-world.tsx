"use client";

import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { FocusImageGallery } from "./focus-image-gallery";
import { OverflowFade } from "../_components/overflow-fade";
import styles from "./loadout.module.css";
import { type ReviewText } from "./reviews";
import type { Catalog } from "@/lib/catalog/types";
import { StorefrontItem } from "../things-for-you/storefront-item";
import { InlineReference } from "./inline-reference";

// Mode motion has one owner: Web Animations. Geometry comes from the rendered
// source/destination, so responsive layouts and pinch previews need no offsets.
const MODE_MOTION = {
  enter: { duration: 450, easing: "cubic-bezier(.42, 0, .18, 1)" },
  exit: { duration: 450, easing: "cubic-bezier(.2, .72, .18, 1)" },
} as const;

const DENSITY_STAGES = [3, 1] as const;
const MIN_PREVIEW_SCALE = 0.56;
const MAX_PREVIEW_SCALE = 5.4;
const ONE_LEVEL_STRENGTH = Math.log(1.055);
const TWO_LEVEL_STRENGTH = Math.log(1.3);

type RegionId = string;

type Region = {
  id: RegionId;
  name: string;
  note: string;
  heading: string;
  kind: "review" | "storefront";
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

const GRAPHITE_IMAGES: Record<string, string> = {
  Belt: "/api/catalog/media?pathname=catalog%2F2dbb3111-a5f1-4926-99f2-e55cdaf8fcf4-2RyRpQQ9H1e2FrsofIbfDjCx9jv9LP.png",
  Coat: "/api/catalog/media?pathname=catalog%2F292e0874-ae4d-493a-8dfa-0fff8210e256-6DZc9B4XoTXANKCqFwyrsQrQcvJAJu.png",
  Hat: "/api/catalog/media?pathname=catalog%2Fa10806a5-3ccc-4ad4-aeaf-897cdded03b4-nTjjUHjdgBjdbVRF5opDnQoB7hCkEA.png",
  Jeans: "/api/catalog/media?pathname=catalog%2F1054caef-e8a1-45bf-a35b-0d0343ecc014-WZNjH6nuvAxobJbVXlUjcViDUdBm4C.png",
  Loafers: "/api/catalog/media?pathname=catalog%2Fa03c2461-1273-4d8a-baaf-f5454b31572b-uE0AKW2Cvniclt2iIlp6i4PVAEa9BL.png",
  Wallet: "/api/catalog/media?pathname=catalog%2F3a5b674b-fb47-4d6a-b8a9-4235ad096014-bJIaR5bGePrQV25jVrjjTRmeetMEG1.png",
};

const ITEM_PRESENTATION: Record<string, { scale: number; x: string; y: string }> = {
  Belt: { scale: 1.08, x: "0%", y: "0%" },
  Coat: { scale: 1.05, x: "0%", y: "2%" },
  Hat: { scale: 1.14, x: "0%", y: "1%" },
  Jeans: { scale: 1.1, x: "0%", y: "-1%" },
  Loafers: { scale: 1.14, x: "0%", y: "0%" },
  Wallet: { scale: 1.2, x: "0%", y: "0%" },
};

const ITEM_ALPHA_BOUNDS: Record<string, { left: number; top: number }> = {
  Belt: { left: 24.5, top: 8.84 },
  Coat: { left: 8.81, top: 22.56 },
  Hat: { left: 22.39, top: 17.69 },
  Jeans: { left: 24.31, top: 11.74 },
  Loafers: { left: 19.36, top: 16.86 },
  Wallet: { left: 15.6, top: 28.02 },
};

type VisualBounds = { left: number; top: number; width: number; height: number };

function measureVisibleBounds(image: HTMLImageElement): VisualBounds | null {
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height) return null;
  const canvas = document.createElement('canvas');
  const factor = Math.min(1, 256 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * factor));
  canvas.height = Math.max(1, Math.round(height * factor));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left) return null;
    return {left: left / canvas.width * 100, top: top / canvas.height * 100,
      width: (right + 1 - left) / canvas.width * 100, height: (bottom + 1 - top) / canvas.height * 100};
  } catch { return null; }
}

function catalogVisualPresentation(bounds?: VisualBounds) {
  if (!bounds) return {scale: 1, x: '0%', y: '0%', left: 9, focusY: -9, visibleHeight: 1};
  const area = bounds.width * bounds.height / 10000;
  const scale = Math.min(1.25, 90 / bounds.width, 90 / bounds.height, Math.sqrt(0.42 / Math.max(0.01, area)));
  const left = 50 + (bounds.left - 50) * scale;
  const top = 50 + (bounds.top - 50) * scale;
  return {scale, x: '0%', y: '0%', left, focusY: -top, visibleHeight: bounds.height * scale / 100};
}

const FOCUSED_VISUAL_TOP = 0;

function itemSlug(item: string) {
  return item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function baseItemName(item: string) {
  return item.replace(/\s+\d+$/, "");
}

function legacyVisualAlignment(item: string) {
  const name = baseItemName(item);
  const bounds = ITEM_ALPHA_BOUNDS[name] ?? { left: 0, top: 0 };
  const presentation = ITEM_PRESENTATION[name] ?? { scale: 1, x: "0%", y: "0%" };
  const translateX = Number.parseFloat(presentation.x) || 0;
  const translateY = Number.parseFloat(presentation.y) || 0;
  const left = 50 + (bounds.left - 50) * presentation.scale + translateX;
  const top = 50 + (bounds.top - 50) * presentation.scale + translateY;

  return {
    left,
    focusY: FOCUSED_VISUAL_TOP - top,
    visibleHeight: 1,
  };
}

function writeCatalogUrl(
  REGIONS: Region[],
  regionId: RegionId | null,
  itemIndex?: number | null,
  replace = false,
) {
  const url = new URL(window.location.href);
  url.search = "";

  if (regionId) {
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

function ReviewParts({ parts }: { parts: ReviewText[] }) {
  return parts.map((part, index) => {
    if (typeof part === "string") {
      const previous = parts[index - 1];
      const attachedPunctuation = previous && typeof previous !== "string" ? part.match(/^[,.;:!?]+/)?.[0] ?? "" : "";
      return <Fragment key={index}>{part.slice(attachedPunctuation.length)}</Fragment>;
    }

    const next = parts[index + 1];
    const attachedPunctuation = typeof next === "string" ? next.match(/^[,.;:!?]+/)?.[0] ?? "" : "";
    return <span key={index} className={styles.entityWithPunctuation}>
      <InlineReference text={part.text} entity={part.entity} />{attachedPunctuation}
    </span>;
  });
}

export function LoadoutWorld({catalog,preview=false,initialSelection}:{catalog:Catalog;preview?:boolean;initialSelection?:{regionId:string|null;itemIndex:number}}) {
  const hasInitialSelection = initialSelection !== undefined;
  const REGIONS = useMemo<Region[]>(() => catalog.regions.map(region => ({id:region.id,name:region.name,heading:region.heading,note:region.description,kind:region.kind,items:catalog.items.filter(item=>item.regionId===region.id).map(item=>item.slug)})), [catalog]);
  const itemsBySlug = useMemo(() => Object.fromEntries(catalog.items.map(item=>[item.slug,item])), [catalog]);
  const legacyByPhoto = useMemo(() => Object.fromEntries(catalog.items
    .filter(item => item.legacyKey && item.photos[0]?.src)
    .map(item => [item.photos[0].src, item.legacyKey!])), [catalog]);
  const [photoBounds, setPhotoBounds] = useState<Record<string, VisualBounds | null>>({});
  const rememberPhotoBounds = useCallback((src: string, image: HTMLImageElement) => {
    if (!src) return;
    const bounds = measureVisibleBounds(image);
    setPhotoBounds(current => src in current ? current : {...current, [src]: bounds});
  }, []);
  const rememberDefaultPhotoBounds = useCallback((src: string) => {
    setPhotoBounds(current => src in current ? current : {...current, [src]: null});
  }, []);
  const itemPresentation = useCallback((slug?: string) => {
    const item = slug ? itemsBySlug[slug] : undefined;
    const legacyKey = item?.legacyKey || legacyByPhoto[item?.photos[0]?.src || ''];
    const legacy = legacyKey ? ITEM_PRESENTATION[legacyKey] : undefined;
    if (legacy && legacyKey) return {...legacy, ...legacyVisualAlignment(legacyKey)};
    // A gallery keeps one presentation across photos; changing it per photo
    // makes the artwork appear to resize as the user navigates.
    return catalogVisualPresentation(photoBounds[item?.photos[0]?.src || ''] ?? undefined);
  }, [itemsBySlug, legacyByPhoto, photoBounds]);
  const itemVisualReady = useCallback((slug: string) => {
    const item = itemsBySlug[slug];
    const src = item?.photos[0]?.src;
    return !src || Boolean(item?.legacyKey || legacyByPhoto[src]) || src in photoBounds;
  }, [itemsBySlug, legacyByPhoto, photoBounds]);
  const itemVisualAlignment = useCallback((slug?:string) => itemPresentation(slug), [itemPresentation]);
  const writeLoadoutUrl = useCallback((region:RegionId|null,itemIndex?:number|null,replace=false) => writeCatalogUrl(REGIONS,region,itemIndex,replace), [REGIONS]);
  const [selectedPhoto,setSelectedPhoto] = useState({item: "", index: 0});
  const [galleryHeights, setGalleryHeights] = useState<Record<string, number[]>>({});
  const [activeRegionId, setActiveRegionId] = useState<RegionId | null>(initialSelection ? initialSelection.regionId : REGIONS[0]?.id ?? null);
  const [stage, setStage] = useState(initialSelection && initialSelection.itemIndex >= 0 ? 1 : 0);
  const [activeItemIndex, setActiveItemIndex] = useState(Math.max(0, initialSelection?.itemIndex ?? 0));
  const [detailItemIndex, setDetailItemIndex] = useState(Math.max(0, initialSelection?.itemIndex ?? 0));
  const [detailsVisible, setDetailsVisible] = useState(true);
  const [imagesInTransit, setImagesInTransit] = useState(false);
  const [enteringRegion, setEnteringRegion] = useState(false);
  const [isDensityTransitioning, setIsDensityTransitioning] = useState(false);
  const [regionTitleVisible, setRegionTitleVisible] = useState(true);
  const modeAnimations = useRef<Animation[]>([]);
  const modeAnimationGeneration = useRef(0);
  const modeTransitionRunning = useRef(false);
  const [memory, setMemory] = useState<RegionMemory>(()=>Object.fromEntries(REGIONS.map(region=>[region.id,{stage:0,scrollTop:0}])));
  const [isPinching, setIsPinching] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedTitleRef = useRef<HTMLHeadingElement>(null);
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
  const focusedNavigationUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedSwipe = useRef<{
    pointerId: number;
    startY: number;
    currentY: number;
    startX: number;
    currentX: number;
    horizontal: boolean;
  } | null>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    viewportRef.current?.style.setProperty("--review-scroll", "0px");
  }, [activeRegionId, activeItemIndex, stage]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const title = focusedTitleRef.current;
    if (stage !== 1 || !viewport || !title) return;

    const updateHeight = (height: number) => {
      viewport.style.setProperty("--focused-measured-title-height", `${height}px`);
    };
    updateHeight(title.offsetHeight);
    const observer = new ResizeObserver(([entry]) => updateHeight(entry.contentRect.height));
    observer.observe(title);
    return () => {
      observer.disconnect();
      viewport.style.removeProperty("--focused-measured-title-height");
    };
  }, [activeRegionId, detailItemIndex, stage]);

  const activeRegion = useMemo(
    () => REGIONS.find((region) => region.id === activeRegionId) ?? null,
    [activeRegionId, REGIONS],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activeRegion?.items.length) return;
    const align = itemVisualAlignment(activeRegion.items[0]).left / 100;
    const updateCopyPosition = () => {
      const width = window.innerWidth;
      const pageStyles = getComputedStyle(viewport.closest('main')!);
      const gutter = Number.parseFloat(pageStyles.getPropertyValue('--overview-gutter'));
      const maxWidth = Number.parseFloat(pageStyles.getPropertyValue('--overview-max-width'));
      const gridWidth = Math.min(width - 2 * gutter, maxWidth);
      const gridGap = Math.max(3, Math.min(width * .0045, 8));
      const firstColumnWidth = (gridWidth - 2 * gridGap) / 3;
      const pageLeft = (width - gridWidth) / 2 + firstColumnWidth * align;
      viewport.style.setProperty('--focused-copy-left', `${pageLeft}px`);
    };
    updateCopyPosition();
    window.addEventListener('resize', updateCopyPosition);
    return () => window.removeEventListener('resize', updateCopyPosition);
  }, [activeRegion, itemVisualAlignment]);

  const photoIndex = selectedPhoto.item === activeRegion?.items[activeItemIndex] ? selectedPhoto.index : 0;
  const detailSlug = activeRegion?.items[detailItemIndex];
  const detailPhotos = detailSlug ? itemsBySlug[detailSlug]?.photos : undefined;
  const detailGalleryKey = detailSlug && detailPhotos ? `${detailSlug}:${detailPhotos.map(photo => photo.src).join('|')}` : "";

  useEffect(() => {
    if (stage !== 1 || !detailSlug || !detailPhotos || detailPhotos.length < 2 || galleryHeights[detailGalleryKey]) return;
    let cancelled = false;
    void Promise.all(detailPhotos.map(async (photo, index) => {
      const image = new window.Image();
      image.src = photo.src;
      const stippleSrc = photo.stippleSrc || (index === 0 ? GRAPHITE_IMAGES[itemsBySlug[detailSlug]?.legacyKey || ""] : undefined);
      if (stippleSrc && stippleSrc !== photo.src) {
        const stipple = new window.Image();
        stipple.src = stippleSrc;
        void stipple.decode().catch(() => {});
      }
      try {
        await image.decode();
        return measureVisibleBounds(image);
      } catch {
        return null;
      }
    })).then(bounds => {
      if (cancelled) return;
      const scale = catalogVisualPresentation(bounds[0] ?? undefined).scale;
      const firstTop = bounds[0]?.top ?? 0;
      setGalleryHeights(current => ({
        ...current,
        [detailGalleryKey]: bounds.map(bound => bound ? Math.max(0.1, (bound.top + bound.height - firstTop) * scale / 100) : 1),
      }));
    });
    return () => { cancelled = true; };
  }, [stage, detailSlug, detailPhotos, detailGalleryKey, galleryHeights, itemsBySlug]);
  const selectPhoto = useCallback((item: string, index: number) => {
    if (itemsBySlug[item]?.photos[index]) setSelectedPhoto({item,index});
  }, [itemsBySlug]);

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
    if (!surface || modeTransitionRunning.current) return;

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

  const commitDensity = useCallback((
    targetStage: number,
    focalX?: number,
    focalY?: number,
    historyItemIndex?: number,
  ) => {
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;
    if (modeTransitionRunning.current || (targetStage === 1 && !activeRegion?.items.length)) return;
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
    const nextItemIndex = historyItemIndex ?? (targetStage === 1 && Number.isFinite(anchorIndex)
      ? anchorIndex
      : activeItemIndex);

    sheet.style.transform = "";
    // Both snapshots must contain stippling; reveal the photo only after arrival.
    flushSync(() => setImagesInTransit(true));
    const update = () => {
      setIsDensityTransitioning(true);
      setActiveItemIndex(nextItemIndex);
      setDetailItemIndex(nextItemIndex);
      setDetailsVisible(true);
      setStage(targetStage);
      window.scrollTo(0, 0);
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    if (reducedMotion || !transitionDocument.startViewTransition) {
      flushSync(update);
      requestAnimationFrame(() => {
        setIsDensityTransitioning(false);
        setImagesInTransit(false);
      });
    } else {
      document.documentElement.dataset.loadoutDensityTransition = targetStage === 1
        ? "focus"
        : "grid";
      const transition = transitionDocument.startViewTransition(() => flushSync(update));
      transition.finished.then(
        () => {
          delete document.documentElement.dataset.loadoutDensityTransition;
          setIsDensityTransitioning(false);
          setImagesInTransit(false);
        },
        () => {
          delete document.documentElement.dataset.loadoutDensityTransition;
          setIsDensityTransitioning(false);
          setImagesInTransit(false);
        },
      );
    }

    if (activeRegionId && historyItemIndex === undefined) {
      writeLoadoutUrl(
        activeRegionId,
        targetStage === 1 ? nextItemIndex : null,
      );
    }

    setIsPinching(false);
  }, [activeItemIndex, activeRegionId, activeRegion?.items.length, reducedMotion, stage, visibleItems, writeLoadoutUrl]);

  const switchMode = useCallback((
    nextRegion: RegionId | null,
    targetStage?: number,
    targetItemIndex?: number | null,
    focalY?: number,
    fromHistory = false,
  ) => {
    if (!fromHistory && (modeTransitionRunning.current || nextRegion === activeRegionId)) return;
    const generation = ++modeAnimationGeneration.current;
    // History navigation must interrupt motion rather than discard the new URL.
    // Measure the current animated positions before cancelling below.
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    const direction = nextRegion ? "enter" : "exit";
    const regionId = nextRegion ?? activeRegionId;
    const sourceSelector = nextRegion && !activeRegionId
      ? `[data-region-id="${regionId}"] [data-world-item-index]`
      : "[data-shared-item-index]";
    const sourceRects = Array.from(
      viewportRef.current?.querySelectorAll<HTMLElement>(sourceSelector) ?? [],
      (item) => item.getBoundingClientRect(),
    );

    modeAnimations.current.forEach((animation) => animation.cancel());
    modeAnimations.current = [];
    const viewport = viewportRef.current;
    if (activeRegionId && viewport) {
      setMemory((current) => ({
        ...current,
        [activeRegionId]: { stage, scrollTop: window.scrollY },
      }));
    }

    const update = () => {
      setImagesInTransit(true);
      setEnteringRegion(Boolean(nextRegion && !activeRegionId));
      setRegionTitleVisible(false);
      if (nextRegion) {
        const remembered = memory[nextRegion] ?? {stage:0,scrollTop:0};
        const nextStage = targetStage ?? remembered.stage;
        setActiveRegionId(nextRegion);
        setStage(nextStage);
        if (targetItemIndex !== undefined && targetItemIndex !== null) {
          setActiveItemIndex(targetItemIndex);
          setDetailItemIndex(targetItemIndex);
        }
        if (fromHistory) setDetailsVisible(true);
        if (!fromHistory) writeLoadoutUrl(
          nextRegion,
          nextStage === 1 ? targetItemIndex : null,
        );
      } else {
        setActiveRegionId(null);
        setStage(0);
        window.scrollTo(0, 0);
        if (!fromHistory) writeLoadoutUrl(null);
      }
      setIsPinching(false);
    };

    const surface = activeRegionId ? sheetRef.current : worldRef.current;
    if (surface) surface.style.transform = "";

    // Commit and settle scroll before measuring, in the same frame. No destination
    // frame is painted before its inverse transform has been installed.
    modeTransitionRunning.current = true;
    flushSync(update);
    if (nextRegion) {
      const item = targetItemIndex != null
        ? viewportRef.current?.querySelector<HTMLElement>(
          `[data-item-id="${nextRegion}-${targetItemIndex}"]`,
        )
        : null;
      // Focused items are positioned by the carousel, not document scrolling.
      if ((targetStage ?? memory[nextRegion].stage) === 1) {
        window.scrollTo(0, 0);
      } else if (item) {
        const rect = item.getBoundingClientRect();
        window.scrollBy(0, rect.top + rect.height / 2 - (focalY ?? window.innerHeight / 2));
      } else {
        window.scrollTo(0, targetStage === undefined ? memory[nextRegion].scrollTop : 0);
      }
    }

    const finish = () => {
      if (generation !== modeAnimationGeneration.current) return;
      modeAnimations.current.forEach((animation) => animation.cancel());
      modeAnimations.current = [];
      modeTransitionRunning.current = false;
      delete viewportRef.current?.dataset.modeTransition;
      setRegionTitleVisible(true);
      setImagesInTransit(false);
      setEnteringRegion(false);
    };
    if (reducedMotion) {
      finish();
      return;
    }

    const destinationSelector = nextRegion
      ? "[data-shared-item-index]"
      : `[data-region-id="${regionId}"] [data-world-item-index]`;
    const destinations = Array.from(
      viewportRef.current?.querySelectorAll<HTMLElement>(destinationSelector) ?? [],
    );
    if (viewportRef.current) viewportRef.current.dataset.modeTransition = direction;
    // Read every destination before writing animations. Animate transforms rather
    // than snapshot widths: the artwork visibly scales as it travels into place.
    const destinationRects = destinations.map((item) => item.getBoundingClientRect());
    modeAnimations.current = destinations.flatMap((destination, index) => {
      const source = sourceRects[index];
      const target = destinationRects[index];
      if (!source || !source.width || !source.height || !target.width || !target.height) return [];
      return [destination.animate([
        {
          transformOrigin: "0 0",
          transform: `translate(${source.left - target.left}px, ${source.top - target.top}px) scale(${source.width / target.width}, ${source.height / target.height})`,
        },
        { transformOrigin: "0 0", transform: "none" },
      ], { ...MODE_MOTION[direction], fill: "both" })];
    });
    // Cancellation also settles finished; never leave the interaction lock stuck.
    void Promise.allSettled(modeAnimations.current.map((animation) => animation.finished)).then(finish);

  }, [activeRegionId, memory, reducedMotion, stage, writeLoadoutUrl]);

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
        gestureSession.current.targetRegion ?? REGIONS[0]?.id ?? null,
        targetPosition - 1,
        targetPosition === 2 ? gestureSession.current.targetItemIndex : null,
        y,
      );
    } else {
      commitDensity(targetPosition - 1, x, y);
    }
  }, [activeRegionId, commitDensity, resetPreview, stage, switchMode, REGIONS]);

  const beginGesture = useCallback((source: GestureSource, x: number, y: number) => {
    if (modeTransitionRunning.current) return false;
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
      if (!targetRegion) {
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
    setDetailsVisible(false);
    setImagesInTransit(!reducedMotion);
    setActiveItemIndex(nextIndex);
    if (window.matchMedia("(max-width: 1100px)").matches) window.scrollTo(0, 0);
    writeLoadoutUrl(activeRegion.id, nextIndex, true);
    if (detailsTimer.current) clearTimeout(detailsTimer.current);
    detailsTimer.current = setTimeout(() => {
      setDetailItemIndex(nextIndex);
      setDetailsVisible(true);
    }, reducedMotion ? 0 : 150);
    if (focusedNavigationUnlockTimer.current) {
      clearTimeout(focusedNavigationUnlockTimer.current);
    }
    focusedNavigationUnlockTimer.current = setTimeout(() => {
      focusedNavigationLocked.current = false;
      focusedNavigationUnlockTimer.current = null;
    }, reducedMotion ? 80 : 520);
  }, [activeItemIndex, activeRegion, reducedMotion, stage, writeLoadoutUrl]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const horizontal = window.matchMedia("(max-width: 1100px)").matches;
    if (event.target instanceof Element && event.target.closest("[data-review-scroll]") && !horizontal) return;
    if (event.target instanceof Element && event.target.closest("a, input, textarea, select, [data-review-scroll] button, [data-photo-navigation] button")) return;
    if (event.pointerType !== "touch") return;
    pointers.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (!horizontal || pointers.current.size > 1) event.currentTarget.setPointerCapture(event.pointerId);
    if (stage === 1 && pointers.current.size === 1) {
      focusedSwipe.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        currentY: event.clientY,
        startX: event.clientX,
        currentX: event.clientX,
        horizontal,
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
      focusedSwipe.current.currentX = event.clientX;
      if (!focusedSwipe.current.horizontal && Math.abs(event.clientY - focusedSwipe.current.startY) > 8) event.preventDefault();
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
      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      const delta = swipe.horizontal ? dx : dy;
      if (swipe.horizontal && Math.abs(dx) <= Math.abs(dy) * 1.5) return;
      if (Math.abs(delta) >= 48) moveFocusedItem(delta < 0 ? 1 : -1);
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    focusedSwipe.current = null;
    cancelGesture("touch");
  }

  const handleWheelInput = useCallback((event: WheelEvent) => {
    if (stage === 1 && window.matchMedia("(max-width: 1100px)").matches && !event.ctrlKey && !event.metaKey) return;
    if (event.target instanceof Element && event.target.closest("[data-review-scroll]")) return;
    if (modeTransitionRunning.current) {
      if (event.cancelable) event.preventDefault();
      return;
    }
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

  const navigateFromHistory = useEffectEvent((region: RegionId | null, itemIndex: number) => {
    const targetStage = itemIndex >= 0 ? 1 : 0;
    if (region && region === activeRegionId) {
      if (modeTransitionRunning.current) {
        ++modeAnimationGeneration.current;
        modeAnimations.current.forEach((animation) => animation.cancel());
        modeAnimations.current = [];
        modeTransitionRunning.current = false;
        setEnteringRegion(false);
        delete viewportRef.current?.dataset.modeTransition;
        setRegionTitleVisible(true);
      }
      if (targetStage !== stage) {
        // Use exactly the same shared-element snapshots as click/pinch navigation.
        commitDensity(targetStage, undefined, undefined, itemIndex >= 0 ? itemIndex : activeItemIndex);
      } else if (itemIndex >= 0) {
        setImagesInTransit(!reducedMotion && itemIndex !== activeItemIndex);
        setActiveItemIndex(itemIndex);
        setDetailItemIndex(itemIndex);
        setDetailsVisible(true);
      }
      return;
    }
    switchMode(region, targetStage, itemIndex >= 0 ? itemIndex : null, undefined, true);
  });

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const restoreFromUrl = (fromHistory = false) => {
      if (detailsTimer.current) {
        clearTimeout(detailsTimer.current);
        detailsTimer.current = null;
      }
      if (focusedNavigationUnlockTimer.current) {
        clearTimeout(focusedNavigationUnlockTimer.current);
        focusedNavigationUnlockTimer.current = null;
      }
      if (focusedWheelTimer.current) {
        clearTimeout(focusedWheelTimer.current);
        focusedWheelTimer.current = null;
      }
      focusedNavigationLocked.current = false;
      focusedWheelDelta.current = 0;

      const params = new URLSearchParams(window.location.search);
      const requestedRegion = params.get("region");
      if (params.get("view") === "world" || !requestedRegion) {
        if (fromHistory) {
          navigateFromHistory(null, -1);
          return;
        }
        setIsDensityTransitioning(true);
        setActiveRegionId(null);
        setStage(0);
        setDetailsVisible(true);
        requestAnimationFrame(() => setIsDensityTransitioning(false));
        requestAnimationFrame(() => window.scrollTo(0, 0));
        return;
      }

      const region = REGIONS.find(
        (candidate) => candidate.id === requestedRegion,
      ) ?? REGIONS[0];
      if (!region) { setActiveRegionId(null); return; }
      const requestedItem = params.get("item");
      const itemIndex = requestedItem
        ? region.items.findIndex((item) => itemSlug(item) === requestedItem)
        : -1;

      if (fromHistory) {
        navigateFromHistory(region.id, itemIndex);
        return;
      }
      setIsDensityTransitioning(true);
      setActiveRegionId(region.id);
      setStage(itemIndex >= 0 ? 1 : 0);
      setActiveItemIndex(itemIndex >= 0 ? itemIndex : 0);
      setDetailItemIndex(itemIndex >= 0 ? itemIndex : 0);
      setDetailsVisible(true);
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        if (fromHistory && itemIndex >= 0) {
          viewportRef.current?.focus({ preventScroll: true });
        }
        setIsDensityTransitioning(false);
      });
    };

    if (!hasInitialSelection) restoreFromUrl();
    const handlePopState = () => restoreFromUrl(true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [REGIONS, hasInitialSelection]);

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
    modeAnimations.current.forEach((animation) => animation.cancel());
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (gestureUnlockTimer.current) clearTimeout(gestureUnlockTimer.current);
    if (focusedWheelTimer.current) clearTimeout(focusedWheelTimer.current);
    if (focusedNavigationUnlockTimer.current) clearTimeout(focusedNavigationUnlockTimer.current);
    if (detailsTimer.current) clearTimeout(detailsTimer.current);
  }, []);

  const onViewportKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("[data-review-scroll]")) return;
    if (stage !== 1 || !activeRegion) return;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveFocusedItem(1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveFocusedItem(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setImagesInTransit(!reducedMotion && activeItemIndex !== 0);
      setActiveItemIndex(0);
      setDetailItemIndex(0);
      writeLoadoutUrl(activeRegion.id, 0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      const lastIndex = activeRegion.items.length - 1;
      setImagesInTransit(!reducedMotion && activeItemIndex !== lastIndex);
      setActiveItemIndex(lastIndex);
      setDetailItemIndex(lastIndex);
      writeLoadoutUrl(activeRegion.id, lastIndex, true);
    }
  }, [activeItemIndex, activeRegion, moveFocusedItem, reducedMotion, stage, writeLoadoutUrl]);

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
            {stage === 0 ? (
              <header
                className={styles.gridHeader}
                data-visible={regionTitleVisible && !isDensityTransitioning ? "true" : "false"}
                style={{
                  "--columns": DENSITY_STAGES[stage],
                  "--first-item-left": `${itemVisualAlignment(activeRegion.items[0]).left}%`,
                } as CSSProperties}
              >
                <span>{activeRegion.heading}</span>
              </header>
            ) : null}
            <div
              ref={sheetRef}
              className={styles.sheet}
            >
              <div
                className={styles.itemLayout}
                onTransitionEnd={(event) => {
                  if (event.target === event.currentTarget && event.propertyName === "transform") {
                    setImagesInTransit(false);
                  }
                }}
                style={{
                  "--columns": DENSITY_STAGES[stage],
                  "--active-item": activeItemIndex,
                } as CSSProperties}
              >
                {!activeRegion.items.length && <p className={styles.emptyRegion}>Nothing here yet. Check back soon.</p>}
                {activeRegion.items.map((item, index) => {
                  const data = itemsBySlug[item];
                  const imageSrc = data?.photos[stage === 1 && index === activeItemIndex ? photoIndex : 0]?.src;
                  const presentation = itemPresentation(item);
                  const alignment = presentation;
                  return (
                    <button
                      key={`${activeRegion.id}-${index}`}
                      className={styles.item}
                      onDragStart={event => event.preventDefault()}
                      data-item-id={`${activeRegion.id}-${index}`}
                      data-active={index === activeItemIndex ? "true" : "false"}
                      data-photo-ready={stage === 1 || !enteringRegion || !imagesInTransit ? "true" : "false"}
                      tabIndex={stage === 1 && index !== activeItemIndex ? -1 : 0}
                      style={{
                        "--item-index": index,
                        "--item-scale": presentation?.scale ?? 1,
                        "--item-x": presentation?.x ?? "0%",
                        "--item-y": presentation?.y ?? "0%",
                        "--focus-y": `${alignment.focusY}%`,
                        "--visual-left": `${alignment.left}%`,
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
                        data-shared-item-index={index}
                        data-has-image={imageSrc ? "true" : "false"}
                        data-visual-ready={itemVisualReady(item) ? "true" : "false"}
                        aria-hidden="true"
                        style={{
                          viewTransitionName: `loadout-${activeRegion.id}-${index}`,
                        } as CSSProperties}
                      >
                        {imageSrc ? (
                          <>
                            <Image
                              src={imageSrc}
                              draggable={false}
                              onLoad={event => rememberPhotoBounds(imageSrc, event.currentTarget)}
                              onError={() => rememberDefaultPhotoBounds(imageSrc)}
                              unoptimized={imageSrc.startsWith("https://") || imageSrc.startsWith("/api/catalog/media?")}
                              alt=""
                              fill
                              sizes="(min-width: 900px) 30vw, 45vw"
                              className={`${styles.itemImage} ${styles.itemPhoto}`}
                            />
                            <Image
                              src={data?.photos[stage === 1 && index === activeItemIndex ? photoIndex : 0]?.stippleSrc || ((stage !== 1 || index !== activeItemIndex || photoIndex === 0) ? GRAPHITE_IMAGES[data?.legacyKey || legacyByPhoto[data?.photos[0]?.src || ""] || ""] : undefined) || imageSrc}
                              draggable={false}
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
              {stage === 1 ? (() => {
                const detailItem = activeRegion.items[detailItemIndex];
                const data = itemsBySlug[detailItem];
                if (!data) return null;
                const content = data.review || {title:data.title,about:[],pros:[],cons:[]};
                const detailsBody = <div className={styles.detailsBody}>
                  {activeRegion.kind !== 'storefront' && <section className={styles.detailSection}>
                    {content.about.map((paragraph, index) => <p key={index}>
                      {index === 0 && <em className={styles.reviewLeadIn}>I acquired{' '}</em>}
                      <ReviewParts parts={paragraph} />
                    </p>)}
                  </section>}
                  {activeRegion.kind !== 'storefront' && (["pros", "cons"] as const).filter(section=>content[section].length).map((section) => (
                    <section key={section} className={styles.detailSection}>
                      <p><em className={styles.reviewLeadIn}>{section === "pros" ? "I love" : "Only notes:"}{' '}</em>{content[section].map((piece, pieceIndex) => <Fragment key={pieceIndex}>
                        {pieceIndex > 0 && " "}
                        {typeof piece === "string" ? piece : <ReviewParts parts={piece} />}
                      </Fragment>)}</p>
                    </section>
                  ))}
                  {activeRegion.kind === 'storefront' ? <StorefrontItem key={data.slug} embedded slug={preview?undefined:data.slug} title={data.title} story={data.description} storyParts={data.review?.about} reason="" photos={data.photos} size={data.size} condition={data.condition} measurements={Object.entries(data.measurements).map(([label,value])=>({label,value}))} status={data.status} owner={data.owner}/> : !data.review && <p>{data.description || 'More about this item soon.'}</p>}
                </div>;
                return (
                  <aside
                    className={styles.focusedDetails}
                    data-visible={detailsVisible && !isDensityTransitioning ? "true" : "false"}
                    aria-live="polite"
                  >
                    <header className={styles.detailsHeader}>
                      <div className={styles.detailsHeaderInner}>
                        <h1 ref={focusedTitleRef}>{data.title}</h1>
                      </div>
                    </header>
                    <FocusImageGallery title={data.title} photos={data.photos} selectedIndex={photoIndex} visualHeight={galleryHeights[detailGalleryKey]?.[photoIndex]} onSelect={index => selectPhoto(detailItem,index)} />
                    {activeRegion.kind === 'storefront' ? (
                      <div key={`${activeRegion.id}-${detailItemIndex}`} className={styles.detailsContent} data-review-scroll data-storefront="true" tabIndex={-1} aria-label="Item review">
                        {detailsBody}
                      </div>
                    ) : (
                      <OverflowFade key={`${activeRegion.id}-${detailItemIndex}`} className={styles.detailsContent} dataReviewScroll label="Item review" onScroll={(event) => {
                        viewportRef.current?.style.setProperty("--review-scroll", `${event.currentTarget.scrollTop}px`);
                      }}>
                        {detailsBody}
                      </OverflowFade>
                    )}
                  </aside>
                );
              })() : null}
            </div>
          </section>
        ) : (
          <section ref={worldRef} className={styles.world} aria-label="Things regions">
            <h1
              className={styles.worldTitle}
              data-visible={regionTitleVisible ? "true" : "false"}
            >
              Things worth mentioning
            </h1>
            <div className={styles.worldGrid}>
              {REGIONS.map((region, regionIndex) => (
                <button
                  key={region.id}
                  className={styles.regionCard}
                  data-region-id={region.id}
                  aria-label={region.name}
                  onClick={() => {
                    switchMode(region.id, 0);
                  }}
                >
                  <span
                    className={styles.miniGrid}
                    aria-hidden="true"
                  >
                    {region.items.slice(0, 6).map((item, index) => {
                      const imageSrc = itemsBySlug[item]?.photos[0]?.stippleSrc || GRAPHITE_IMAGES[itemsBySlug[item]?.legacyKey || legacyByPhoto[itemsBySlug[item]?.photos[0]?.src || ""] || ""] || itemsBySlug[item]?.photos[0]?.src;
                      const presentation = itemPresentation(item);
                      return (
                        <span
                          key={index}
                          data-world-item-index={index}
                          data-has-image={imageSrc ? "true" : "false"}
                          data-visual-ready={itemVisualReady(item) ? "true" : "false"}
                          style={{
                            "--item-index": index + regionIndex * 7,
                            "--item-scale": presentation?.scale ?? 1,
                            "--item-x": presentation?.x ?? "0%",
                            "--item-y": presentation?.y ?? "0%",
                          } as CSSProperties}
                        >
                          {imageSrc ? (
                            <>
                            <Image
                              src={imageSrc}
                              unoptimized={imageSrc.startsWith("https://") || imageSrc.startsWith("/api/catalog/media?")}
                              alt=""
                              fill
                              sizes="(min-width: 900px) 12vw, 24vw"
                              className={styles.itemImage}
                            />
                            {itemsBySlug[item]?.photos[0]?.src && !itemsBySlug[item]?.legacyKey && !legacyByPhoto[itemsBySlug[item]?.photos[0]?.src || ""] && <Image
                              src={itemsBySlug[item].photos[0].src}
                              alt=""
                              fill
                              unoptimized
                              aria-hidden="true"
                              onLoad={event => rememberPhotoBounds(itemsBySlug[item].photos[0].src, event.currentTarget)}
                              onError={() => rememberDefaultPhotoBounds(itemsBySlug[item].photos[0].src)}
                              style={{opacity:0, pointerEvents:'none'}}
                            />}
                            </>
                          ) : String(index + 1).padStart(2, "0")}
                        </span>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 6 - region.items.length) }, (_, index) => (
                      <span key={`empty-${index}`} data-empty="true" />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

"use client";

import {
  Fragment,
  startTransition,
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FocusPhoto } from "./focus-photo";
import { prepareFocusPhoto, prepareGridPhoto } from "@/lib/catalog/image-loading";
import { ThingsHomeHeading, ThingsCategoryLinks } from "./things-home-content";
import { itemHref, regionHref } from "./catalog-navigation";
import { useRouter } from "next/navigation";
import { FocusImageGallery } from "./focus-image-gallery";
import { FocusImageViewer } from "./focus-image-viewer";
import { OverflowFade } from "../_components/overflow-fade";
import styles from "./loadout.module.css";
import { type ReviewText } from "./reviews";
import type { Catalog } from "@/lib/catalog/types";
import { GridPhoto } from "./grid-photo";
import worldPhotoBounds from "./world-photo-bounds.json";
import { StorefrontItem } from "../things-for-you/storefront-item";
import { InlineReference } from "./inline-reference";

const COLUMNS_BY_VIEW = [3, 1] as const;

type RegionId = string;

type Region = {
  id: RegionId;
  name: string;
  note: string;
  heading: string;
  kind: "review" | "storefront";
  items: string[];
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

export function LoadoutWorld({catalog,preview=false,initialSelection,dedicatedItem=false}:{catalog:Catalog;preview?:boolean;dedicatedItem?:boolean;initialSelection?:{regionId:string|null;itemIndex:number}}) {
  const REGIONS = useMemo<Region[]>(() => catalog.regions.map(region => ({id:region.id,name:region.name,heading:region.heading,note:region.description,kind:region.kind,items:catalog.items.filter(item=>item.regionId===region.id).map(item=>item.slug)})), [catalog]);
  const itemsBySlug = useMemo(() => Object.fromEntries(catalog.items.map(item=>[item.slug,item])), [catalog]);
  const legacyByPhoto = useMemo(() => Object.fromEntries(catalog.items
    .filter(item => item.legacyKey && item.photos[0]?.src)
    .map(item => [item.photos[0].src, item.legacyKey!])), [catalog]);
  const [photoBounds, setPhotoBounds] = useState<Record<string, VisualBounds | null>>(
    () => worldPhotoBounds as Record<string, VisualBounds>
  );
  const rememberPhotoBounds = useCallback((src: string, image: HTMLImageElement) => {
    if (!src || src in photoBounds) return;
    const bounds = measureVisibleBounds(image);
    setPhotoBounds(current => src in current ? current : {...current, [src]: bounds});
  }, [photoBounds]);
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
  const router = useRouter();

  const photoRequest = useRef(0);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [selectedPhoto,setSelectedPhoto] = useState({item: "", index: 0});
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageRect, setViewerImageRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [galleryHeights, setGalleryHeights] = useState<Record<string, number[]>>({});
  const activeRegionId = initialSelection ? initialSelection.regionId : REGIONS[0]?.id ?? null;
  const stage = initialSelection && initialSelection.itemIndex >= 0 ? 1 : 0;
  const activeItemIndex = Math.max(0, initialSelection?.itemIndex ?? 0);
  const detailItemIndex = Math.max(0, initialSelection?.itemIndex ?? 0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedHeaderRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeRegionId || stage !== 0) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let cancelled = false;
    // Warm only the first grid row, after the home page has had time to paint.
    const sources = [...new Set(Array.from({length:3}, (_, index) =>
      REGIONS.map(region => itemsBySlug[region.items[index]]?.photos[0]?.src)
    ).flat().filter((src): src is string => !!src))];
    let next = 0;
    async function worker() {
      while (!cancelled && next < sources.length) {
        await prepareGridPhoto(sources[next++]).catch(() => {});
      }
    }
    const start = () => { void worker(); void worker(); };
    const idle = 'requestIdleCallback' in window ? window.requestIdleCallback(start, {timeout:2000}) : undefined;
    const timer = idle === undefined ? setTimeout(start, 400) : undefined;
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [activeRegionId, stage, REGIONS, itemsBySlug]);

  useLayoutEffect(() => {
    viewportRef.current?.style.setProperty("--review-scroll", "0px");
  }, [activeRegionId, activeItemIndex, stage]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const header = focusedHeaderRef.current;
    if (stage !== 1 || !viewport || !header) return;

    const updateHeight = (height: number) => {
      viewport.style.setProperty("--focused-measured-title-height", `${height}px`);
    };
    updateHeight(header.offsetHeight);
    const observer = new ResizeObserver(([entry]) => updateHeight(entry.contentRect.height));
    observer.observe(header);
    return () => {
      observer.disconnect();
      viewport.style.removeProperty("--focused-measured-title-height");
    };
  }, [activeRegionId, detailItemIndex, stage]);

  const activeRegion = useMemo(
    () => REGIONS.find((region) => region.id === activeRegionId) ?? null,
    [activeRegionId, REGIONS],
  );



  const photoIndex = selectedPhoto.item === activeRegion?.items[activeItemIndex] ? selectedPhoto.index : 0;
  const detailSlug = activeRegion?.items[detailItemIndex];
  const detailPhotos = detailSlug ? itemsBySlug[detailSlug]?.photos : undefined;
  const detailGalleryKey = detailSlug && detailPhotos ? `${detailSlug}:${detailPhotos.map(photo => photo.src).join('|')}` : "";

  useEffect(() => {
    if (stage !== 1 || !detailSlug || !detailPhotos || detailPhotos.length < 2) return;
    let cancelled = false;
    void (async () => {
      const bounds: (VisualBounds | null)[] = detailPhotos.map(() => null);
      // Decode the visible photo first, then its immediate neighbors, then
      // remaining photos one at a time instead of flooding the connection.
      const order = [...new Set([0, 1, detailPhotos.length - 1, ...detailPhotos.map((_, index) => index)])];
      for (const index of order) {
        if (cancelled) return;
        try {
          const image = await prepareFocusPhoto(detailPhotos[index].src, index === 0 ? 'high' : 'low');
          if (cancelled) return;
          bounds[index] = measureVisibleBounds(image);
        } catch { /* Keep the fallback bounds when a photo cannot load. */ }
        if (cancelled) return;
        // Controls need usable first-photo geometry, not the whole queue.
        const scale = catalogVisualPresentation(bounds[0] ?? undefined).scale;
        const firstTop = bounds[0]?.top ?? 0;
        setGalleryHeights(current => ({
          ...current,
          [detailGalleryKey]: bounds.map(bound => bound ? Math.max(0.1, (bound.top + bound.height - firstTop) * scale / 100) : 1),
        }));
      }
    })();
    return () => { cancelled = true; };
  }, [stage, detailSlug, detailPhotos, detailGalleryKey]);
  useEffect(() => () => { photoRequest.current++; }, [detailSlug]);
  const selectPhoto = useCallback(async (item: string, index: number) => {
    const photo = itemsBySlug[item]?.photos[index];
    if (!photo) return;
    const request = ++photoRequest.current;
    setPhotoLoading(true);
    setPhotoError(false);
    try {
      await prepareFocusPhoto(photo.src, 'high');
      if (request !== photoRequest.current) return;
      setSelectedPhoto({item,index});
    } catch {
      if (request === photoRequest.current) setPhotoError(true);
    } finally {
      if (request === photoRequest.current) setPhotoLoading(false);
    }
  }, [itemsBySlug]);

  const handlePhotoSelect = useCallback((index: number) => {
    if (detailSlug) void selectPhoto(detailSlug, index);
  }, [detailSlug, selectPhoto]);

  const switchMode = (regionId: RegionId | null) => {
    startTransition(() => router.push(regionHref(regionId, preview)));
  };

  return (
    <main className={styles.page} data-things-page data-dedicated-item={dedicatedItem ? "true" : undefined}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        style={{ '--focused-first-item-align': activeRegion?.items.length ? itemVisualAlignment(activeRegion.items[0]).left / 100 : 0 } as CSSProperties}
        data-mode={activeRegionId ? "region" : "world"}
        data-stage={stage}
        data-focus-kind={activeRegion?.kind}
        tabIndex={stage === 1 ? 0 : undefined}
      >
        {activeRegion ? (
          <section
            className={styles.region}
            aria-label={`${activeRegion.name} items`}
          >
            {stage === 0 ? (
              <header
                className={styles.gridHeader}
                data-visible="true"
                style={{
                  "--columns": COLUMNS_BY_VIEW[stage],
                  "--first-item-left": `${itemVisualAlignment(activeRegion.items[0]).left}%`,
                } as CSSProperties}
              >
                <span>
                  {activeRegion.heading}
                  {activeRegion.id === "things-for-you" && (
                    <span className={styles.gridSubtitle}>
                      Sometimes possessions find the wrong host. Maybe you&apos;re the right one.
                    </span>
                  )}
                </span>
              </header>
            ) : null}
            <div
              ref={sheetRef}
              className={styles.sheet}
            >
              <div
                className={styles.itemLayout}
                style={{
                  "--columns": COLUMNS_BY_VIEW[stage],
                } as CSSProperties}
              >
                {!activeRegion.items.length && <p className={styles.emptyRegion}>Nothing here yet. Check back soon.</p>}
                {activeRegion.items.map((item, index) => {
                  if (stage === 1 && index !== activeItemIndex) return null;
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
                      data-photo-ready="true"
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
                      onClick={() => {
                        if (stage === 0) {
                          startTransition(() => router.push(itemHref(item, activeRegion.id, preview), { scroll: false }));
                        }
                      }}
                    >
                      <span
                        className={styles.itemMedia}
                        data-shared-item-index={index}
                        data-has-image={imageSrc ? "true" : "false"}
                        data-visual-ready={itemVisualReady(item) ? "true" : "false"}
                        aria-hidden="true"
                      >
                        {imageSrc ? (
                          <>
                            {stage === 0 ? <GridPhoto key={imageSrc} src={imageSrc} eager={index < 3}
                              onReady={image => rememberPhotoBounds(imageSrc, image)}
                              onError={() => rememberDefaultPhotoBounds(imageSrc)} /> : <FocusPhoto key={imageSrc} src={imageSrc} item={item}
                              onReady={image => rememberPhotoBounds(imageSrc, image)}
                              onError={() => rememberDefaultPhotoBounds(imageSrc)} />}

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
                      {content[section].map((piece, index) => <p key={index}>
                        {index === 0 && <em className={styles.reviewLeadIn}>{section === "pros" ? "I love" : "Only notes:"}{' '}</em>}
                        {typeof piece === "string" ? piece : <ReviewParts parts={piece} />}
                      </p>)}
                    </section>
                  ))}
                  {activeRegion.kind === 'storefront' ? <StorefrontItem key={data.slug} embedded externalMobileActions={dedicatedItem} factsAboveStory slug={preview?undefined:data.slug} title={data.title} story={data.description} storyParts={data.review?.about} reason="" photos={data.photos} size={data.size} condition={data.condition} measurements={Object.entries(data.measurements).map(([label,value])=>({label,value}))} status={data.status} owner={data.owner}/> : !data.review && <p>{data.description || 'More about this item soon.'}</p>}
                </div>;
                return (
                  <>
                  <aside
                    className={styles.focusedDetails}
                    data-visible="true"
                    aria-live="polite"
                    style={{
                      "--focused-mobile-visual-height": Math.min(1, itemPresentation(detailItem).visibleHeight + 0.08),
                    } as CSSProperties}
                  >
                    <header className={styles.detailsHeader}>
                      <div className={styles.detailsHeaderInner} ref={focusedHeaderRef}>
                        <h1>{data.model || data.title}</h1>
                        {data.brand && <p className={styles.productIdentity}>{data.brand}</p>}
                      </div>
                    </header>
                    {data.photos.length > 0 && <button className={styles.mobileGalleryTrigger} type="button" aria-label={`View photos of ${data.title}`} aria-haspopup="dialog" onClick={() => {
                      const image = viewportRef.current?.querySelector<HTMLImageElement>(`.${styles.item}[data-active="true"] .${styles.itemPhoto}`);
                      const rect = image?.getBoundingClientRect();
                      setViewerImageRect(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null);
                      setImageViewerOpen(true);
                    }} />}
                    <FocusImageGallery loading={photoLoading} error={photoError} title={data.title} photos={data.photos} selectedIndex={photoIndex} visualHeight={galleryHeights[detailGalleryKey]?.[photoIndex]} onSelect={handlePhotoSelect} />
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
                  <FocusImageViewer loading={photoLoading} error={photoError} open={imageViewerOpen} imageRect={viewerImageRect} title={data.title} photos={data.photos} selectedIndex={photoIndex} onSelect={handlePhotoSelect} onClose={() => setImageViewerOpen(false)} />
                  </>
                );
              })() : null}
            </div>
          </section>
        ) : (
          <section ref={worldRef} className={`${styles.world} ${styles.worldHome}`} aria-label="Things regions">
            <div className={styles.homeCopy}>
              <ThingsHomeHeading subtitle={<>Amazing <em>things</em> are created every day. These are a few physical items I’ve come across. Some of these could be yours.</>} />
              <ThingsCategoryLinks regions={REGIONS} onSelect={switchMode} />
            </div>
            <picture className={styles.footerArtwork}>
              <source media="(max-width: 700px)" srcSet="/things/footer-mobile.webp" />
              {/* Precomposed decorative artwork, served locally without runtime filters. */}
              <img src="/things/footer-desktop.webp" alt="" width="1920" height="270" decoding="async" draggable={false} />
            </picture>
          </section>
        )}
      </div>
    </main>
  );
}

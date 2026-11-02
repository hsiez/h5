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
import Image from "next/image";
import { ThingsHomeHeading, ThingsCategoryLinks } from "./things-home-content";
import { itemHref, regionHref } from "./catalog-navigation";
import { useRouter } from "next/navigation";
import { FocusImageGallery } from "./focus-image-gallery";
import { FocusImageViewer } from "./focus-image-viewer";
import { OverflowFade } from "../_components/overflow-fade";
import styles from "./loadout.module.css";
import { type ReviewText } from "./reviews";
import type { Catalog } from "@/lib/catalog/types";
import worldThumbnails from "./world-thumbnails.json";
import worldPhotoBounds from "./world-photo-bounds.json";
import { StorefrontItem, StorefrontItemFacts } from "../things-for-you/storefront-item";
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
  const router = useRouter();

  const [selectedPhoto,setSelectedPhoto] = useState({item: "", index: 0});
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageRect, setViewerImageRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [galleryHeights, setGalleryHeights] = useState<Record<string, number[]>>({});
  const activeRegionId = initialSelection ? initialSelection.regionId : REGIONS[0]?.id ?? null;
  const stage = initialSelection && initialSelection.itemIndex >= 0 ? 1 : 0;
  const activeItemIndex = Math.max(0, initialSelection?.itemIndex ?? 0);
  const detailItemIndex = Math.max(0, initialSelection?.itemIndex ?? 0);
  const [fullStippleReady, setFullStippleReady] = useState<Record<string, true>>({});
  const preloadedStipples = useRef(new Set<string>());
  const preloadMounted = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const focusedTitleRef = useRef<HTMLHeadingElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    preloadMounted.current = true;
    return () => { preloadMounted.current = false; };
  }, []);

  useEffect(() => {
    const regions = activeRegionId ? REGIONS.filter(region => region.id === activeRegionId) : REGIONS;
    const sources = [...new Set(Array.from({length: 6}, (_, index) => regions.map(region => {
      const item = itemsBySlug[region.items[index]];
      return item?.photos[0]?.stippleSrc || GRAPHITE_IMAGES[item?.legacyKey || legacyByPhoto[item?.photos[0]?.src || ""] || ""] || item?.photos[0]?.src;
    })).flat())].filter((src): src is string => Boolean(src && (worldThumbnails as Record<string, string>)[src] && !preloadedStipples.current.has(src)));
    if (!sources.length) return;

    let secondFrame = 0;
    // A second animation frame starts these requests only after the browser has
    // had a chance to paint the lightweight world thumbnails.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        let next = 0;
        const preload = async () => {
          while (preloadMounted.current && next < sources.length) {
            const src = sources[next++];
            if (preloadedStipples.current.has(src)) continue;
            preloadedStipples.current.add(src);
            const image = new window.Image();
            image.decoding = "async";
            image.fetchPriority = "low";
            image.src = src;
            try {
              await image.decode();
              if (preloadMounted.current) setFullStippleReady(current => current[src] ? current : {...current, [src]: true});
            } catch { preloadedStipples.current.delete(src); }
          }
        };
        // Limit simultaneous full-size decodes so they do not monopolize the
        // main thread immediately after the first paint.
        void preload();
        void preload();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [activeRegionId, REGIONS, itemsBySlug, legacyByPhoto]);

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
                <span>{activeRegion.heading}</span>
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
                  const fullStippleSrc = data?.photos[stage === 1 && index === activeItemIndex ? photoIndex : 0]?.stippleSrc || ((stage !== 1 || index !== activeItemIndex || photoIndex === 0) ? GRAPHITE_IMAGES[data?.legacyKey || legacyByPhoto[data?.photos[0]?.src || ""] || ""] : undefined) || imageSrc;
                  const thumbnailSrc = fullStippleSrc ? (worldThumbnails as Record<string, string>)[fullStippleSrc] : undefined;
                  const stippleSrc = thumbnailSrc && !fullStippleReady[fullStippleSrc] ? thumbnailSrc : fullStippleSrc;
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
                            <Image
                              src={imageSrc}
                              data-motion-image={item}
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
                              src={stippleSrc || imageSrc}
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
                  {activeRegion.kind === 'storefront' ? <StorefrontItem key={data.slug} embedded externalMobileActions={dedicatedItem} factsUnderTitle slug={preview?undefined:data.slug} title={data.title} story={data.description} storyParts={data.review?.about} reason="" photos={data.photos} size={data.size} condition={data.condition} measurements={Object.entries(data.measurements).map(([label,value])=>({label,value}))} status={data.status} owner={data.owner}/> : !data.review && <p>{data.description || 'More about this item soon.'}</p>}
                </div>;
                return (
                  <>
                  <aside
                    className={styles.focusedDetails}
                    data-visible="true"
                    aria-live="polite"
                    style={{
                      "--focused-mobile-visual-height": Math.min(1, Math.max(0.55, itemPresentation(detailItem).visibleHeight + 0.08)),
                    } as CSSProperties}
                  >
                    <header className={styles.detailsHeader}>
                      <div className={styles.detailsHeaderInner}>
                        <h1 ref={focusedTitleRef}>{data.title}</h1>
                        {activeRegion.kind === 'storefront' && <div className={styles.mobileTitleFacts}><StorefrontItemFacts size={data.size} condition={data.condition} measurements={Object.entries(data.measurements).map(([label, value]) => ({ label, value }))} /></div>}
                      </div>
                    </header>
                    {data.photos.length > 0 && <button className={styles.mobileGalleryTrigger} type="button" aria-label={`View photos of ${data.title}`} aria-haspopup="dialog" onClick={() => {
                      const image = viewportRef.current?.querySelector<HTMLImageElement>(`.${styles.item}[data-active="true"] .${styles.itemPhoto}`);
                      const rect = image?.getBoundingClientRect();
                      setViewerImageRect(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null);
                      setImageViewerOpen(true);
                    }} />}
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
                  <FocusImageViewer open={imageViewerOpen} imageRect={viewerImageRect} title={data.title} photos={data.photos} selectedIndex={photoIndex} onSelect={index => selectPhoto(detailItem,index)} onClose={() => setImageViewerOpen(false)} />
                  </>
                );
              })() : null}
            </div>
          </section>
        ) : (
          <section ref={worldRef} className={`${styles.world} ${styles.worldHome}`} aria-label="Things regions">
            <div className={styles.homeCopy}>
              <ThingsHomeHeading subtitle="Amazing things are built every day. These are a few I’ve come across. Some of these could be yours." />
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

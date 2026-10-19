"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import dynamic from "next/dynamic";
import { DEFAULT_LOCATION_MAP_STYLE } from "../_components/location-map-style";
import { PaperFrame } from "../_components/paper-frame";
import { ThumbnailFrame } from "../_components/thumbnail-frame";
import type { ReviewText } from "./reviews";
import styles from "./loadout.module.css";

type Entity = Exclude<ReviewText, string>["entity"];
type Placement = { left: number; top: number; width: number; maxHeight: number };

const POPUP_GAP = 12;

const LocationMapCard = dynamic(
  () => import("../_components/location-map-card").then((module) => module.LocationMapCard),
  { ssr: false, loading: () => <div className={styles.locationLoading}>Loading map…</div> },
);

function EntityIcon({ kind }: { kind: Entity["kind"] }) {
  return kind === "location" ? (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="4.2" r="2.3" />
      <path d="M8 6.5v4.2" />
      <path d="M5.6 9.9c-2.3.5-3.7 1.2-3.7 2.1 0 1.6 2.7 2.7 6.1 2.7s6.1-1.1 6.1-2.7c0-.9-1.4-1.6-3.7-2.1" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.7" y="2.2" width="12.6" height="11.6" rx="1.4" />
      <circle cx="5.4" cy="5.9" r="1.1" />
      <path d="m2.4 11.5 3.1-3 2.2 2 2.2-2.2 3.4 3.4" />
    </svg>
  );
}

export function InlineReference({ text, entity }: { text: string; entity: Entity }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ left: 0, top: 0, width: 376, maxHeight: 320 });

  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };
  const positionPanel = useCallback(() => {
    const anchor = trigger.current?.getBoundingClientRect();
    if (!anchor) return;
    const viewport = window.visualViewport;
    const edgeLeft = viewport?.offsetLeft ?? 0;
    const edgeTop = viewport?.offsetTop ?? 0;
    const edgeRight = edgeLeft + (viewport?.width ?? window.innerWidth);
    const edgeBottom = edgeTop + (viewport?.height ?? window.innerHeight);
    const width = Math.min(376, edgeRight - edgeLeft - POPUP_GAP * 2);
    const height = panel.current?.scrollHeight ?? 320;
    const left = Math.max(edgeLeft + POPUP_GAP, Math.min(anchor.left, edgeRight - width - POPUP_GAP));
    const roomBelow = Math.max(0, edgeBottom - anchor.bottom - POPUP_GAP * 2);
    const roomAbove = Math.max(0, anchor.top - edgeTop - POPUP_GAP * 2);
    const showBelow = height <= roomBelow || roomBelow >= roomAbove;
    const maxHeight = Math.max(0, edgeBottom - edgeTop - POPUP_GAP * 2);
    const visibleHeight = Math.min(height, maxHeight);
    const preferredTop = showBelow
      ? anchor.bottom + POPUP_GAP
      : anchor.top - POPUP_GAP - visibleHeight;
    const top = Math.max(edgeTop + POPUP_GAP, Math.min(preferredTop, edgeBottom - POPUP_GAP - visibleHeight));
    setPlacement((current) => current.left === left && current.top === top && current.width === width && current.maxHeight === maxHeight
      ? current : { left, top, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node &&
          !trigger.current?.contains(event.target) &&
          !panel.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", positionPanel, true);
    window.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    const resizeObserver = new ResizeObserver(positionPanel);
    if (panel.current) resizeObserver.observe(panel.current);
    if (panel.current?.firstElementChild) resizeObserver.observe(panel.current.firstElementChild);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", positionPanel, true);
      window.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
      resizeObserver.disconnect();
    };
  }, [open, positionPanel]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return <>
    <button
      ref={trigger}
      type="button"
      className={styles.inlineEntityTrigger}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
      onMouseLeave={closeSoon}
      onFocus={() => { clearCloseTimer(); setOpen(true); }}
      onBlur={(event) => {
        if (!panel.current?.contains(event.relatedTarget)) closeSoon();
      }}
      onClick={() => { clearCloseTimer(); setOpen(true); }}
    ><EntityIcon kind={entity.kind} /><span>{text}</span></button>
    {open && createPortal(
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-label={entity.kind === "location" ? `${entity.name} map preview` : entity.caption}
        className={styles.entityHoverPanel}
        style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={closeSoon}
      >
        {entity.kind === "location" ? (
          <LocationMapCard
            {...DEFAULT_LOCATION_MAP_STYLE}
            place={entity.name}
            city={entity.city}
            latitude={entity.latitude}
            longitude={entity.longitude}
            zoom={entity.zoom}
          />
        ) : (
          <PaperFrame className={styles.imagePaperShell}>
            <ThumbnailFrame className={styles.imagePopup}>
              <div className={styles.entityArtwork}>
                <Image src={entity.src} alt={entity.alt} width={720} height={480} unoptimized />
              </div>
            </ThumbnailFrame>
          </PaperFrame>
        )}
      </div>, document.body)}
  </>;
}

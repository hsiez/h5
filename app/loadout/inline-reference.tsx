"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import dynamic from "next/dynamic";
import { DEFAULT_LOCATION_MAP_STYLE } from "../_components/location-map-style";
import edgeFadeStyles from "../_components/edge-fade.module.css";
import { PaperFrame } from "../_components/paper-frame";
import { ThumbnailFrame } from "../_components/thumbnail-frame";
import entityStyles from "../_components/inline-entity-trigger.module.css";
import type { ReviewText } from "./reviews";
import styles from "./loadout.module.css";

type Entity = Exclude<ReviewText, string>["entity"];
type Placement = { left: number; top: number; width: number; maxHeight: number; constrained: boolean };

const POPUP_GAP = 6;
const VIEWPORT_INSET = 12;
const CLOSE_DELAY_MS = 50;
const FADE_MS = 200;

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
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterFrame = useRef<number | null>(null);
  const closing = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ left: 0, top: 0, width: 376, maxHeight: 320, constrained: false });

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const clearUnmountTimer = useCallback(() => {
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    unmountTimer.current = null;
  }, []);
  const cancelEnterFrame = useCallback(() => {
    if (enterFrame.current !== null) cancelAnimationFrame(enterFrame.current);
    enterFrame.current = null;
  }, []);
  const hide = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    clearCloseTimer();
    clearUnmountTimer();
    cancelEnterFrame();
    setVisible(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMounted(false);
    } else {
      unmountTimer.current = setTimeout(() => setMounted(false), FADE_MS);
    }
  }, [cancelEnterFrame, clearCloseTimer, clearUnmountTimer]);
  const show = useCallback(() => {
    closing.current = false;
    clearCloseTimer();
    clearUnmountTimer();
    if (mounted) setVisible(true);
    else setMounted(true);
  }, [clearCloseTimer, clearUnmountTimer, mounted]);
  const closeSoon = useCallback(() => {
    if (closing.current) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(hide, CLOSE_DELAY_MS);
  }, [clearCloseTimer, hide]);
  const positionPanel = useCallback(() => {
    const anchor = trigger.current?.getBoundingClientRect();
    if (!anchor) return;
    const viewport = window.visualViewport;
    const edgeLeft = viewport?.offsetLeft ?? 0;
    const edgeTop = viewport?.offsetTop ?? 0;
    const edgeRight = edgeLeft + (viewport?.width ?? window.innerWidth);
    const edgeBottom = edgeTop + (viewport?.height ?? window.innerHeight);
    const width = Math.min(376, edgeRight - edgeLeft - VIEWPORT_INSET * 2);
    const height = panel.current?.scrollHeight ?? 320;
    const left = Math.max(edgeLeft + VIEWPORT_INSET, Math.min(anchor.left, edgeRight - width - VIEWPORT_INSET));
    const roomBelow = Math.max(0, edgeBottom - anchor.bottom - POPUP_GAP - VIEWPORT_INSET);
    const roomAbove = Math.max(0, anchor.top - edgeTop - POPUP_GAP - VIEWPORT_INSET);
    const showBelow = height <= roomBelow || roomBelow >= roomAbove;
    const maxHeight = Math.max(0, edgeBottom - edgeTop - VIEWPORT_INSET * 2);
    const constrained = height > maxHeight;
    const visibleHeight = Math.min(height, maxHeight);
    const preferredTop = showBelow
      ? anchor.bottom + POPUP_GAP
      : anchor.top - POPUP_GAP - visibleHeight;
    const top = Math.max(edgeTop + VIEWPORT_INSET, Math.min(preferredTop, edgeBottom - VIEWPORT_INSET - visibleHeight));
    setPlacement((current) => current.left === left && current.top === top && current.width === width && current.maxHeight === maxHeight && current.constrained === constrained
      ? current : { left, top, width, maxHeight, constrained });
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    positionPanel();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node &&
          !trigger.current?.contains(event.target) &&
          !panel.current?.contains(event.target)) hide();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { trigger.current?.focus(); hide(); }
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
  }, [mounted, positionPanel, hide]);
  useLayoutEffect(() => {
    if (!mounted) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = () => {
      enterFrame.current = null;
      setVisible(true);
    };
    enterFrame.current = requestAnimationFrame(() => {
      if (reducedMotion) reveal();
      else enterFrame.current = requestAnimationFrame(reveal);
    });
    return cancelEnterFrame;
  }, [mounted, cancelEnterFrame]);
  useEffect(() => () => {
    clearCloseTimer();
    clearUnmountTimer();
    cancelEnterFrame();
  }, [cancelEnterFrame, clearCloseTimer, clearUnmountTimer]);

  return <>
    <button
      ref={trigger}
      type="button"
      className={entityStyles.trigger}
      aria-haspopup="dialog"
      aria-expanded={visible}
      aria-controls={mounted ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={closeSoon}
      onFocus={show}
      onBlur={(event) => {
        if (!panel.current?.contains(event.relatedTarget)) closeSoon();
      }}
      onClick={show}
    ><EntityIcon kind={entity.kind} /><span>{text}</span></button>
    {mounted && createPortal(
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-label={entity.kind === "location" ? `${entity.name} map preview` : entity.caption}
        className={`${styles.entityHoverPanel} ${placement.constrained ? styles.entityHoverPanelConstrained : ""}`}
        data-visible={visible}
        aria-hidden={!visible}
        style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.constrained ? placement.maxHeight : undefined }}
        onMouseEnter={show}
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
          <PaperFrame elevation="popover" className={styles.imagePaperShell}>
            <ThumbnailFrame className={styles.imagePopup}>
              <div className={styles.entityArtwork}>
                <Image src={entity.src} alt={entity.alt} width={entity.width} height={entity.height} unoptimized />
                <div className={`${edgeFadeStyles.fade} ${edgeFadeStyles.compact}`} aria-hidden="true" />
              </div>
            </ThumbnailFrame>
          </PaperFrame>
        )}
      </div>, document.body)}
  </>;
}

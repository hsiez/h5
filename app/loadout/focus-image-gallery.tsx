"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { PaperFrame } from "../_components/paper-frame";
import styles from "./loadout.module.css";

type Photo = { src: string };

/** Controls follow the displayed artwork without moving the surrounding layout. */
export function FocusImageGallery({
  title,
  photos,
  selectedIndex,
  visualHeight,
  onSelect,
}: {
  title: string;
  photos: Photo[];
  selectedIndex: number;
  visualHeight?: number;
  onSelect: (index: number) => void;
}) {
  const navigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigationRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 180,
      easing: "ease-out",
    });
  }, [selectedIndex]);

  if (photos.length < 2) return null;

  return (
    <div className={styles.focusImageGallery} data-photo-navigation data-ready={visualHeight ? "true" : "false"} style={{"--gallery-visual-height": visualHeight ?? 1} as CSSProperties}>
      <div className={styles.photoHitZones}>
        <button type="button" aria-label="Previous photo" onClick={() => onSelect((selectedIndex + photos.length - 1) % photos.length)} />
        <button type="button" aria-label="Next photo" onClick={() => onSelect((selectedIndex + 1) % photos.length)} />
      </div>
      <div ref={navigationRef} className={styles.photoNavigation} role="group" aria-label={`Photos of ${title}`}>
        <PaperFrame elevation="popover" className={styles.photoDotFrame}>
          {photos.map((photo, index) => (
            <button key={photo.src} type="button" className={styles.photoDot} aria-label={`Show photo ${index + 1} of ${photos.length}`} aria-current={selectedIndex === index ? "true" : undefined} onClick={() => onSelect(index)} />
          ))}
        </PaperFrame>
      </div>
    </div>
  );
}

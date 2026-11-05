"use client";

import type { CSSProperties } from "react";
import frameStyles from "../_components/paper-frame.module.css";
import styles from "./loadout.module.css";
import controlStyles from "./focus-image-gallery.module.css";

type Photo = { src: string };

export function FocusImageGallery({
  title, loading = false, error = false, photos, selectedIndex, visualHeight, onSelect,
}: {
  title: string;
  loading?: boolean;
  error?: boolean;
  photos: Photo[];
  selectedIndex: number;
  visualHeight?: number;
  onSelect: (index: number) => void;
}) {
  if (photos.length < 2) return null;

  return (
    <div className={`${styles.focusImageGallery} ${controlStyles.gallery}`} data-photo-navigation
      data-ready={visualHeight ? "true" : "false"}
      style={{ "--gallery-visual-height": visualHeight ?? 1 } as CSSProperties}
      role="group" aria-label={`Photos of ${title}`}>
      <button className={`${frameStyles.frame} ${frameStyles.popover} ${controlStyles.previous}`}
        type="button" aria-label="Previous photo"
        onClick={() => onSelect((selectedIndex + photos.length - 1) % photos.length)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 10l8 7M4 10h14" /></svg>
      </button>
      <span className={controlStyles.status} role="status">
        {loading ? "Loading photo…" : error ? "Could not load photo. Try again." : `Photo ${selectedIndex + 1} of ${photos.length}`}
      </span>
      <button className={`${frameStyles.frame} ${frameStyles.popover} ${controlStyles.next}`}
        type="button" aria-label="Next photo"
        onClick={() => onSelect((selectedIndex + 1) % photos.length)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l8 7-8 7M16 10H2" /></svg>
      </button>
    </div>
  );
}

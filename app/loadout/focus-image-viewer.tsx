"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./focus-image-viewer.module.css";
import frameStyles from "../_components/paper-frame.module.css";

type Photo = { src: string };

export function FocusImageViewer({
  open,
  imageRect,
  title,
  photos,
  selectedIndex,
  onSelect,
  onClose,
}: {
  open: boolean;
  imageRect?: { top: number; left: number; width: number; height: number } | null;
  title: string;
  photos: Photo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = previousOverflow; };
  }, [open]);

  const photo = photos[selectedIndex];
  if (!photo) return null;

  return <dialog
    ref={dialogRef}
    className={styles.viewer}
    aria-label={`Photos of ${title}`}
    onClose={onClose}
    onKeyDown={event => {
      if (photos.length < 2) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); onSelect((selectedIndex + photos.length - 1) % photos.length); }
      if (event.key === "ArrowRight") { event.preventDefault(); onSelect((selectedIndex + 1) % photos.length); }
    }}
  >
    <button className={`${styles.close} ${frameStyles.frame} ${frameStyles.popover}`} type="button" onClick={onClose} aria-label="Close photo viewer">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
    </button>
    <div className={styles.image} style={imageRect ? { top: imageRect.top, left: imageRect.left, width: imageRect.width, height: imageRect.height, right: 'auto', bottom: 'auto' } satisfies CSSProperties : undefined}>
      <Image src={photo.src} alt={`${title}, photo ${selectedIndex + 1} of ${photos.length}`} fill sizes="100vw" unoptimized={photo.src.startsWith("https://") || photo.src.startsWith("/api/catalog/media?")} draggable={false} />
    </div>
    {photos.length > 1 && <nav className={styles.controls} aria-label="Photo gallery controls">
      <button className={`${frameStyles.frame} ${frameStyles.popover}`} type="button" onClick={() => onSelect((selectedIndex + photos.length - 1) % photos.length)} aria-label="Previous photo">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 10l8 7M4 10h14" /></svg>
      </button>
      <span aria-live="polite">{selectedIndex + 1} / {photos.length}</span>
      <button className={`${frameStyles.frame} ${frameStyles.popover}`} type="button" onClick={() => onSelect((selectedIndex + 1) % photos.length)} aria-label="Next photo">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l8 7-8 7M16 10H2" /></svg>
      </button>
    </nav>}
  </dialog>;
}

"use client";

import { useId, useState } from "react";
import styles from "./loadout.module.css";

export function InlineReference({ text, note }: { text: string; note: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.inlineReference} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-expanded={open} aria-controls={id}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }} onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
        {text}
      </button>
      <span id={id} role="note" className={styles.referenceNote} hidden={!open}>{note}</span>
    </span>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "./expandable-text";
import { SoundwaveButton, ScrollFade, cardShadow } from "./paper-carousel";

const spring = { type: "spring" as const, duration: 0.5, bounce: 0.1 };

export function MobilePaperList({
  papers,
  date,
}: {
  papers: PaperResult[];
  date: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? (papers.find((p) => p.arxivId === selectedId) ?? null)
    : null;
  const modalRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setSelectedId(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!selected) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  useEffect(() => {
    if (!selected || !modalRef.current) return;
    const modal = modalRef.current;

    function trapFocus(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);
    const closeBtn = modal.querySelector<HTMLElement>("button");
    closeBtn?.focus();
    return () => document.removeEventListener("keydown", trapFocus);
  }, [selected, close]);

  return (
    <>
      <div className="flex flex-col gap-3">
        {papers.map((paper) => (
          <motion.button
            key={paper.arxivId}
            layoutId={paper.arxivId}
            ref={(el) => { if (selectedId === paper.arxivId) triggerRef.current = el; }}
            onClick={() => { triggerRef.current = document.activeElement as HTMLButtonElement; setSelectedId(paper.arxivId); }}
            className="text-left p-5 rounded-lg bg-(--color-surface-sunken) flex flex-col gap-2"
            style={{
              boxShadow: cardShadow,
              opacity: selectedId === paper.arxivId ? 0 : 1,
            }}
            transition={spring}
          >
            <h2 className="font-serif text-lg font-semibold text-(--color-text-primary) leading-snug line-clamp-2">
              {paper.title}
            </h2>
            <p className="font-serif text-sm text-(--color-text-tertiary)">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
            </p>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.article
            key="expanded"
            ref={modalRef}
            layoutId={selected.arxivId}
            role="dialog"
            aria-label={selected.title}
            className="fixed inset-0 z-50 bg-(--color-surface-sunken) flex flex-col overflow-hidden"
            transition={spring}
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center px-5 pt-3">
              <button
                onClick={close}
                className="p-3 -ml-3 text-(--color-text-tertiary) active:text-(--color-text-primary)"
                aria-label="Close"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-4 right-4 z-[2]" style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
              <SoundwaveButton
                audioSrc={`/api/papers/${date}/${selected.arxivId}/audio`}
              />
            </div>

            <div className="flex flex-col gap-3 px-6 pt-4 pb-2">
              <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-snug">
                {selected.title}
              </h2>
              <p className="font-serif text-sm text-(--color-text-tertiary)">
                {selected.authors.slice(0, 4).join(", ")}
                {selected.authors.length > 4 &&
                  ` +${selected.authors.length - 4}`}
              </p>
            </div>

            <motion.div
              className="flex-1 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <ScrollFade>
                <ExpandableText text={selected.script} expanded glossary={selected.glossary} className="px-6" />
              </ScrollFade>
            </motion.div>

            <footer className="flex items-center gap-3 px-6 py-4 shrink-0">
              <a
                href={`https://arxiv.org/abs/${selected.arxivId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-(--color-text-tertiary) px-3 py-1.5 rounded-full bg-white/80"
              >
                arXiv
              </a>
              {selected.githubRepo && (
                <a
                  href={`https://github.com/${selected.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-(--color-text-tertiary) px-3 py-1.5 rounded-full bg-white/80"
                >
                  GitHub
                </a>
              )}
            </footer>
          </motion.article>
        )}
      </AnimatePresence>
    </>
  );
}

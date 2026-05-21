"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PaperResult } from "@/lib/types";
import { ExpandableText } from "./expandable-text";
import { ScrollFade, cardShadow } from "./paper-carousel";

const spring = { type: "spring" as const, duration: 0.5, bounce: 0.1 };
const headerSpring = { type: "spring" as const, duration: 0.45, bounce: 0.12 };
const SPEEDS = [1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MobilePaperList({
  papers,
  date,
}: {
  papers: PaperResult[];
  date: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const selected = selectedId
    ? (papers.find((p) => p.arxivId === selectedId) ?? null)
    : null;
  const modalRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [audioActive, setAudioActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const seekingRef = useRef(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1);

  const audioProgress = audioDuration > 0 ? (audioTime / audioDuration) * 100 : 0;

  const close = useCallback(() => {
    audioRef.current?.pause();
    setSelectedId(null);
    setAudioActive(false);
    setAudioPlaying(false);
    setAudioTime(0);
    setAudioDuration(0);
    triggerRef.current?.focus();
  }, []);

  const startAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setAudioActive(true);
      return;
    }
    const paper = papers.find((p) => p.arxivId === selectedId);
    if (!paper) return;
    const audio = new Audio(`/api/papers/${date}/${paper.arxivId}/audio`);
    audio.addEventListener("play", () => setAudioPlaying(true));
    audio.addEventListener("pause", () => setAudioPlaying(false));
    audio.addEventListener("timeupdate", () => setAudioTime(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => { if (Number.isFinite(audio.duration)) setAudioDuration(audio.duration); });
    audio.addEventListener("durationchange", () => { if (Number.isFinite(audio.duration)) setAudioDuration(audio.duration); });
    audio.addEventListener("ended", () => { setAudioActive(false); setAudioPlaying(false); setAudioTime(0); });
    audioRef.current = audio;
    audio.play();
    setAudioActive(true);
  }, [selectedId, papers, date]);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setAudioActive(true);
    } else {
      audio.pause();
      setAudioActive(false);
    }
  }, []);

  const seekAudio = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !Number.isFinite(audioDuration) || audioDuration === 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audioDuration;
  }, [audioDuration]);

  const cycleAudioSpeed = useCallback(() => {
    setAudioSpeed((prev) => {
      const idx = SPEEDS.indexOf(prev as (typeof SPEEDS)[number]);
      const next = SPEEDS[(idx + 1) % SPEEDS.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setAudioActive(false);
      setAudioPlaying(false);
      setAudioTime(0);
      setAudioDuration(0);
      setAudioSpeed(1);
    }
  }, [selectedId]);

  const handleContentScroll = useCallback((scrollTop: number) => {
    if (scrollTop > 30) setHeaderVisible(false);
    else if (scrollTop < 5) setHeaderVisible(true);
  }, []);

  useEffect(() => {
    if (selectedId) setHeaderVisible(true);
  }, [selectedId]);

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
      <div className="flex flex-col gap-6">
        {papers.map((paper) => (
          <button
            key={paper.arxivId}
            ref={(el) => { if (selectedId === paper.arxivId) triggerRef.current = el; }}
            onClick={() => { triggerRef.current = document.activeElement as HTMLButtonElement; setSelectedId(paper.arxivId); }}
            className="text-left p-5 rounded-lg bg-(--color-surface-sunken) flex flex-col gap-2"
            style={{ boxShadow: cardShadow }}
          >
            <h2 className="font-serif text-lg font-semibold text-(--color-text-primary) leading-snug line-clamp-2">
              {paper.title}
            </h2>
            <p className="font-serif text-sm text-(--color-text-tertiary)" aria-label="Authors">
              {paper.authors.slice(0, 3).join(", ")}
              {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
            </p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.article
            key="expanded"
            ref={modalRef}
            role="dialog"
            aria-label={selected.title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={spring}
            className="fixed inset-0 z-50 bg-(--color-surface-sunken) flex flex-col overflow-hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <motion.div
              className="flex-1 min-h-0 flex flex-col"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <ScrollFade onScroll={handleContentScroll}>
                <motion.div
                  initial={false}
                  animate={{
                    opacity: headerVisible ? 1 : 0,
                    y: headerVisible ? 0 : -12,
                  }}
                  transition={headerSpring}
                  role="presentation"
                  className="flex flex-col gap-3 px-6 pt-5 pb-4"
                >
                  <h2 className="font-serif text-xl font-semibold text-(--color-text-primary) leading-snug">
                    {selected.title}
                  </h2>
                  <p className="font-serif text-sm text-(--color-text-tertiary)" aria-label="Authors">
                    {selected.authors.slice(0, 4).join(", ")}
                    {selected.authors.length > 4 &&
                      ` +${selected.authors.length - 4}`}
                  </p>
                </motion.div>
                <ExpandableText text={selected.script} expanded glossary={selected.glossary} definitionStyle="bottom-panel" className="px-6" />
              </ScrollFade>
            </motion.div>

            <footer className="flex items-center gap-3 px-6 py-4 shrink-0">
              <button
                onClick={close}
                className="shrink-0 p-3 text-(--color-text-tertiary) active:text-(--color-text-primary)"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
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
              {audioActive ? (
                <>
                  <span className="text-sm text-(--color-text-tertiary) tabular-nums shrink-0">
                    {formatTime(audioTime)}
                  </span>
                  <div
                    ref={progressBarRef}
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(audioDuration)}
                    aria-valuenow={Math.round(audioTime)}
                    onPointerDown={(e) => { seekingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekAudio(e); }}
                    onPointerMove={(e) => { if (seekingRef.current) seekAudio(e); }}
                    onPointerUp={() => { seekingRef.current = false; }}
                    className="flex-1 h-8 flex items-center cursor-pointer group"
                  >
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(20,20,20,0.08)" }}>
                      <div
                        className="h-full bg-(--color-text-tertiary) rounded-full transition-colors"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-(--color-text-tertiary) tabular-nums shrink-0">
                    {audioDuration > 0 ? formatTime(audioDuration) : "--:--"}
                  </span>
                  <button
                    onClick={cycleAudioSpeed}
                    aria-label={`Playback speed ${audioSpeed}×`}
                    className="shrink-0 text-sm tabular-nums text-(--color-text-tertiary) text-center"
                    style={{ width: 44 }}
                  >
                    {audioSpeed}×
                  </button>
                </>
              ) : (
                <>
                  <div className="h-6 w-px bg-(--color-text-tertiary)/20" />
                  <a
                    href={`https://arxiv.org/abs/${selected.arxivId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-(--color-text-tertiary) underline transition-colors"
                  >
                    arXiv
                  </a>
                  {selected.githubRepo && (
                    <a
                      href={`https://github.com/${selected.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-(--color-text-tertiary) underline transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                </>
              )}
              <button
                onClick={audioActive ? toggleAudio : startAudio}
                aria-label={audioPlaying ? "Pause audio" : "Play audio"}
                className="ml-auto shrink-0 p-2 text-(--color-text-primary)"
              >
                {audioPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.3 3.7a1 1 0 0 0-1.55.83v10.94a1 1 0 0 0 1.55.83l8.5-5.47a1 1 0 0 0 0-1.66l-8.5-5.47Z" />
                  </svg>
                )}
              </button>
            </footer>
          </motion.article>
        )}
      </AnimatePresence>
    </>
  );
}

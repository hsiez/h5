"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Popover } from "@/app/_components/popover";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ transform: "translateX(1px)" }}>
      <path d="M6.3 3.7a1 1 0 0 0-1.55.83v10.94a1 1 0 0 0 1.55.83l8.5-5.47a1 1 0 0 0 0-1.66l-8.5-5.47Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
    </svg>
  );
}

export function AudioPlayer({
  src,
  active = true,
  autoPlay = false,
  knownDuration,
  className,
}: {
  src: string;
  active?: boolean;
  autoPlay?: boolean;
  knownDuration?: number;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const seekingRef = useRef(false);
  const speedRef = useRef(1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const [speedOpen, setSpeedOpen] = useState(false);
  const speedBtnRef = useRef<HTMLButtonElement>(null);

  const pickSpeed = useCallback((value: number) => {
    setSpeed(value);
    speedRef.current = value;
    if (audioRef.current) audioRef.current.playbackRate = value;
    setSpeedOpen(false);
  }, []);

  const closeSpeedMenu = useCallback(() => setSpeedOpen(false), []);

  const getSeekableDuration = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return 0;
    if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    if (audio.seekable.length > 0) return audio.seekable.end(audio.seekable.length - 1);
    return 0;
  }, []);

  const seekTo = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      const audio = audioRef.current;
      if (!bar || !audio) return;
      const dur = getSeekableDuration();
      if (dur === 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * dur;
    },
    [getSeekableDuration],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      seekingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekTo(e.clientX);
    },
    [seekTo],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!seekingRef.current) return;
      seekTo(e.clientX);
    },
    [seekTo],
  );

  const onPointerUp = useCallback(() => {
    seekingRef.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const step = 5;
      if (e.key === "ArrowRight") {
        audio.currentTime = Math.min(duration, audio.currentTime + step);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        audio.currentTime = Math.max(0, audio.currentTime - step);
        e.preventDefault();
      }
    },
    [duration],
  );

  useEffect(() => {
    if (!active && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [active]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = speedRef.current;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(knownDuration ?? 0);
  }, [src, knownDuration]);

  useEffect(() => {
    if (autoPlay && audioRef.current) audioRef.current.play();
  }, [autoPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => setPlaying(false);
    let durationResolved = false;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (!durationResolved) {
        const dur = Number.isFinite(audio.duration) ? audio.duration
          : audio.seekable.length > 0 ? audio.seekable.end(audio.seekable.length - 1) : 0;
        if (Number.isFinite(dur) && dur > 0) { setDuration(dur); durationResolved = true; }
      }
    };
    const onMeta = () => { if (Number.isFinite(audio.duration)) setDuration(audio.duration); };
    const onDurationChange = () => { if (Number.isFinite(audio.duration)) setDuration(audio.duration); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onProgress = () => {
      if (!durationResolved) {
        const dur = Number.isFinite(audio.duration) ? audio.duration
          : audio.seekable.length > 0 ? audio.seekable.end(audio.seekable.length - 1) : 0;
        if (Number.isFinite(dur) && dur > 0) { setDuration(dur); durationResolved = true; }
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        aria-busy={loading}
        className="icon shrink-0 rounded-full text-(--color-text-primary) hover:bg-(--color-surface-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <span className="text-sm text-(--color-text-tertiary) tabular-nums w-10 shrink-0">
        {formatTime(currentTime)}
      </span>

      <div
        ref={progressRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative flex-1 h-8 flex items-center cursor-pointer group focus-visible:outline-none"
      >
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(20,20,20,0.08)" }}>
          <div
            className="h-full bg-(--color-text-tertiary) group-hover:bg-(--color-text-secondary) rounded-full transition-colors"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-sm text-(--color-text-tertiary) tabular-nums w-10 shrink-0 text-right">
        {Number.isFinite(duration) && duration > 0 ? formatTime(duration) : "--:--"}
      </span>

      <button
        ref={speedBtnRef}
        type="button"
        onClick={() => setSpeedOpen(!speedOpen)}
        aria-haspopup="listbox"
        aria-expanded={speedOpen}
        aria-label={`Playback speed ${speed}×`}
        className="shrink-0 text-sm tabular-nums text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors py-0.5 rounded text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-500)"
        style={{ width: 44 }}
      >
        {speed}×
      </button>
      <Popover open={speedOpen} onClose={closeSpeedMenu} anchorRef={speedBtnRef} className="py-0.5" style={{ minWidth: 56 }}>
        <div role="listbox" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === speed}
              onClick={() => pickSpeed(s)}
              className="w-full px-2 py-1 text-sm tabular-nums text-left transition-colors hover:bg-(--color-surface-muted)"
              style={{ color: s === speed ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}
            >
              {s}×
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

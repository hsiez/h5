"use client";

import { useRef } from "react";

export function HoverVideo({
  src,
  label,
  poster,
  className,
}: {
  src: string;
  label: string;
  poster: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.getAttribute("src")) {
      video.setAttribute("src", src);
      video.load();
    }

    void video.play().catch(() => {});
  };

  const pause = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <video
      ref={videoRef}
      aria-label={label}
      loop
      muted
      playsInline
      poster={poster}
      preload="none"
      className={className}
      onBlur={pause}
      onFocus={play}
      onPointerEnter={play}
      onPointerLeave={pause}
    />
  );
}

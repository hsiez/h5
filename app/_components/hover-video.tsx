"use client";

import { useRef } from "react";

export function HoverVideo({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    void videoRef.current?.play().catch(() => {});
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
      src={src}
      aria-label={label}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
      onBlur={pause}
      onFocus={play}
      onPointerEnter={play}
      onPointerLeave={pause}
    />
  );
}

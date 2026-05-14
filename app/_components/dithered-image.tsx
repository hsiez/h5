"use client";

import { HalftoneDots } from "@paper-design/shaders-react";

export function DitheredImage({
  src,
  width,
  height,
  className,
}: {
  src: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ width, height }}>
      <HalftoneDots
        style={{ width: "100%", height: "100%" }}
        image={src}
        colorBack="#f4f4f4"
        colorFront="#2b2b2b"
        originalColors={false}
        type="gooey"
        grid="hex"
        inverted={false}
        size={0.01}
        radius={0.97}
        contrast={1}
        grainMixer={0.2}
        grainOverlay={0}
        grainSize={0.5}
        fit="contain"
      />
    </div>
  );
}

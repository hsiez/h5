"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import styles from "./stipple-button.module.css";

export type StippleFrameSettings = {
  centerHeight: number;
  centerStrength: number;
  density: number;
  edgeFalloff: number;
  edgeStrength: number;
  highlightDensity: number;
};

export const STIPPLE_FRAME_PRESETS = {
  v0: {
    density: 3.5,
    edgeStrength: 0.62,
    edgeFalloff: 0.65,
    centerHeight: 1.49,
    centerStrength: 0.12,
    highlightDensity: 0,
  },
} as const satisfies Record<string, StippleFrameSettings>;

type StippleFrameProps = {
  centerHeight?: number;
  centerStrength?: number;
  className?: string;
  density?: number;
  edgeFalloff?: number;
  edgeStrength?: number;
  highlightDensity?: number;
  radius?: number;
  seed: string;
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceFromRoundedEdge(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const qx = Math.abs(x - width / 2) - (width / 2 - radius);
  const qy = Math.abs(y - height / 2) - (height / 2 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return -(outside + inside - radius);
}

export function StippleFrame({
  centerHeight = STIPPLE_FRAME_PRESETS.v0.centerHeight,
  centerStrength = STIPPLE_FRAME_PRESETS.v0.centerStrength,
  className,
  density = STIPPLE_FRAME_PRESETS.v0.density,
  edgeFalloff = STIPPLE_FRAME_PRESETS.v0.edgeFalloff,
  edgeStrength = STIPPLE_FRAME_PRESETS.v0.edgeStrength,
  highlightDensity = STIPPLE_FRAME_PRESETS.v0.highlightDensity,
  radius = 14,
  seed,
}: StippleFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const random = createRandom(hashSeed(seed));
      const band = Math.max(10, Math.min(rect.width, rect.height) * 0.28);
      const sampleCount = Math.round(rect.width * rect.height * 0.42 * density);

      context.save();
      context.beginPath();
      context.roundRect(0, 0, rect.width, rect.height, radius);
      context.clip();

      for (let index = 0; index < sampleCount; index += 1) {
        const x = random() * rect.width;
        const y = random() * rect.height;
        const edgeDistance = distanceFromRoundedEdge(
          x,
          y,
          rect.width,
          rect.height,
          radius,
        );
        if (edgeDistance < 0) continue;

        const edgeInfluence = Math.exp(-edgeDistance / (band * edgeFalloff));
        const horizontal = x / rect.width;
        const vertical = y / rect.height;
        const shadowBias = 0.56 + vertical * 0.34;
        const centerHighlight = Math.exp(
          -(
            Math.pow((horizontal - 0.5) / 0.58, 2)
            + Math.pow((vertical - 0.45) / centerHeight, 2)
          ),
        );
        const highlightReach = 0.16 + (1 - horizontal) * 0.14;
        const topBorderHighlight = Math.exp(
          -Math.pow((edgeDistance - 3.5) / 1.35, 2),
        ) * Math.exp(
          -Math.pow(Math.abs((horizontal - 0.5) / 0.53), 8),
        ) * Math.exp(-Math.pow(vertical / highlightReach, 4));
        const bottomBorderHighlight = Math.exp(
          -Math.pow((edgeDistance - 3.5) / 1.35, 2),
        ) * Math.exp(
          -Math.pow(Math.abs((horizontal - 0.5) / 0.53), 8),
        ) * Math.exp(-Math.pow((1 - vertical) / highlightReach, 4));
        const faceTone = 0.12 + vertical * 0.1;
        const uniformRim = edgeInfluence * edgeStrength;
        const innerShadow = (1 - edgeInfluence) * shadowBias * 0.13;
        const highlightLift = (centerHighlight * centerStrength
          + topBorderHighlight * 0.72
          + bottomBorderHighlight * 0.72) * (1 - highlightDensity);
        const inkDensity = Math.max(
          0.006,
          Math.min(0.96, faceTone + uniformRim + innerShadow - highlightLift),
        );
        const probability = Math.min(0.96, inkDensity * density);
        if (random() > probability) continue;

        const mark = random();
        const dotRadius = mark > 0.93 && inkDensity > 0.54
          ? 0.58 + random() * 0.52
          : mark > 0.7
            ? 0.26 + random() * (0.3 + inkDensity * 0.32)
            : 0.1 + random() * (0.2 + inkDensity * 0.26);
        const aspect = 0.72 + random() * 0.56;
        const rotation = random() * Math.PI;
        const tone = random();
        const alpha = 0.4 + inkDensity * 0.54;
        context.fillStyle = tone > 0.8
          ? `rgba(118, 118, 113, ${alpha * 0.68})`
          : tone > 0.63
            ? `rgba(62, 62, 59, ${alpha * 0.82})`
            : `rgba(16, 16, 15, ${alpha})`;
        context.beginPath();
        context.ellipse(
          x,
          y,
          dotRadius * aspect,
          dotRadius / aspect,
          rotation,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      const rimCount = Math.round(rect.width * rect.height * 0.24 * density);
      for (let index = 0; index < rimCount; index += 1) {
        const x = random() * rect.width;
        const y = random() * rect.height;
        const edgeDistance = distanceFromRoundedEdge(
          x,
          y,
          rect.width,
          rect.height,
          radius,
        );
        if (edgeDistance < 0 || edgeDistance > 2.15) continue;

        const edgeWeight = 1 - edgeDistance / 2.15;
        if (random() > 0.58 + edgeWeight * 0.38) continue;

        const dotRadius = 0.12 + random() * (0.24 + edgeWeight * 0.2);
        context.fillStyle = `rgba(10, 10, 9, ${0.62 + edgeWeight * 0.32})`;
        context.beginPath();
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fill();
      }

      const microCount = Math.round(rect.width * rect.height * 0.055);
      context.fillStyle = "rgba(92, 92, 88, 0.34)";
      for (let index = 0; index < microCount; index += 1) {
        const x = random() * rect.width;
        const y = random() * rect.height;
        const edgeDistance = distanceFromRoundedEdge(
          x,
          y,
          rect.width,
          rect.height,
          radius,
        );
        if (edgeDistance < 0) continue;

        const horizontal = x / rect.width;
        const vertical = y / rect.height;
        const highlight = Math.exp(
          -(
            Math.pow((horizontal - 0.5) / 0.58, 2)
            + Math.pow((vertical - 0.45) / centerHeight, 2)
          ),
        );
        if (random() > 0.22 - highlight * 0.2) continue;

        const microRadius = 0.08 + random() * 0.16;
        context.beginPath();
        context.arc(x, y, microRadius, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      canvas.dataset.ready = "true";
    };

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  }, [
    centerHeight,
    centerStrength,
    density,
    edgeFalloff,
    edgeStrength,
    highlightDensity,
    radius,
    seed,
  ]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

type StippleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  eyebrow?: ReactNode;
  seed: string;
  settings?: Partial<StippleFrameSettings>;
};

export function StippleButton({
  children,
  className,
  eyebrow,
  seed,
  settings,
  type = "button",
  ...props
}: StippleButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles.button}${className ? ` ${className}` : ""}`}
    >
      <StippleFrame
        {...STIPPLE_FRAME_PRESETS.v0}
        {...settings}
        className={styles.frame}
        radius={11}
        seed={seed}
      />
      <span className={styles.text}>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <strong>{children}</strong>
      </span>
    </button>
  );
}

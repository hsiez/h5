"use client";

import { createContext, useContext } from "react";

export type Orientation = "landscape" | "portrait";

export const OrientationContext = createContext<Orientation>("landscape");

export function useOrientation(): Orientation {
  return useContext(OrientationContext);
}

export const CANVAS = {
  landscape: { w: 1280, h: 720 },
  portrait: { w: 720, h: 1280 },
} as const;

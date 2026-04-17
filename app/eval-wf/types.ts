import type { ReactNode } from "react";

export type SlideContent = {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  body: ReactNode | ((step: number) => ReactNode);
  /**
   * Number of micro-steps within the slide. ↓/→ advances steps before moving
   * to the next slide; ↑/← rewinds steps before going back. Defaults to 1.
   */
  steps?: number;
};

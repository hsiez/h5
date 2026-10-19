import type { ReactNode } from "react";
import styles from "./thumbnail-frame.module.css";

export function ThumbnailFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.frame} ${className}`}>{children}</div>;
}

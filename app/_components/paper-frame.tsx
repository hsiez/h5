import type { ReactNode } from "react";
import styles from "./paper-frame.module.css";

type PaperFrameProps = {
  children: ReactNode;
  className?: string;
  elevation?: "base" | "popover";
} & (
  | { as?: "div" }
  | { as: "a"; href: string; target?: "_blank"; rel?: string }
);

export function PaperFrame(props: PaperFrameProps) {
  const className = `${styles.frame} ${props.elevation === "popover" ? styles.popover : ""} ${props.className ?? ""}`;
  if (props.as === "a") {
    return <a className={className} href={props.href} target={props.target} rel={props.rel}>{props.children}</a>;
  }
  return <div className={className}>{props.children}</div>;
}

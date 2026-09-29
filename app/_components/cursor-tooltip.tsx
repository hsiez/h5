"use client";

import { forwardRef } from "react";
import styles from "./cursor-tooltip.module.css";

type CursorTooltipProps = {
  detail?: string;
  expanded?: boolean;
  visible: boolean;
};

export const CursorTooltip = forwardRef<HTMLDivElement, CursorTooltipProps>(
  function CursorTooltip({ detail, expanded = false, visible }, ref) {
    return (
      <div
        ref={ref}
        className={styles.tooltip}
        data-expanded={expanded ? "true" : "false"}
        data-visible={visible ? "true" : "false"}
        role="tooltip"
        aria-hidden={visible ? undefined : "true"}
      >
        {detail ? <span>{detail}</span> : null}
      </div>
    );
  },
);

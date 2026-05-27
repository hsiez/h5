"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const SHADOW =
  "0 4px 8px -2px rgba(20,20,20,0.06), 0 2px 4px -2px rgba(20,20,20,0.04), 0 0 0 1px rgba(20,20,20,0.04), inset 0 0 0 1px rgba(255,255,255,1)";

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  className,
  style: styleProp,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    tailLeft: number;
    direction: "up" | "down";
  } | null>(null);

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const anchorCenterX = rect.left + rect.width / 2;
    const panelWidth = panelRef.current?.offsetWidth ?? 280;
    const gap = 8;

    let left = anchorCenterX - panelWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    const tailLeft = anchorCenterX - left - 6;

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow > 200) {
      setPos({
        top: rect.bottom + gap,
        left,
        tailLeft,
        direction: "down",
      });
    } else {
      setPos({
        bottom: window.innerHeight - rect.top + gap,
        left,
        tailLeft,
        direction: "up",
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: PointerEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    window.addEventListener("pointerdown", handleClick);
    return () => window.removeEventListener("pointerdown", handleClick);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 rounded-sm bg-(--color-surface) ${className ?? ""}`}
      style={{
        ...(pos?.top != null ? { top: pos.top } : {}),
        ...(pos?.bottom != null ? { bottom: pos.bottom } : {}),
        left: pos?.left ?? 0,
        boxShadow: SHADOW,
        visibility: pos ? "visible" : "hidden",
        ...styleProp,
      }}
    >
      {children}
      {pos && (
        <svg
          aria-hidden="true"
          width="12"
          height="6"
          viewBox="0 0 12 6"
          className="absolute"
          style={
            pos.direction === "down"
              ? {
                  bottom: "100%",
                  left: pos.tailLeft,
                  transform: "rotate(180deg)",
                  filter:
                    "drop-shadow(0 -1px 1px rgba(20,20,20,0.06))",
                }
              : {
                  top: "100%",
                  left: pos.tailLeft,
                  filter:
                    "drop-shadow(0 1px 1px rgba(20,20,20,0.06))",
                }
          }
        >
          <path d="M0 0l6 6 6-6z" fill="white" />
          <path
            d="M0.5 0l5.5 5.5L11.5 0"
            fill="none"
            stroke="rgba(20,20,20,0.04)"
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
}

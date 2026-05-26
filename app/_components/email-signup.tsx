"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { Popover } from "@/app/_components/popover";

const SUBSCRIBE_URL = process.env.NEXT_PUBLIC_SUBSCRIBE_URL!;

type Status = "idle" | "submitting" | "success" | "error";

export function EmailSignup({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onClose = useCallback(() => setOpen(false), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");

    startTransition(async () => {
      try {
        const res = await fetch(SUBSCRIBE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Something went wrong");
          return;
        }

        setStatus("success");
        setMessage(data.message ?? "Check your email to confirm");
        setEmail("");
      } catch {
        setStatus("error");
        setMessage("Could not reach the server");
      }
    });
  }

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-sm bg-white text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors cursor-pointer shadow-[0_2px_4px_-1px_rgba(20,20,20,0.06),0_1px_2px_-1px_rgba(20,20,20,0.04),0_0_0_1px_rgba(20,20,20,0.04),inset_0_0_0_1px_rgba(255,255,255,1)]"
        aria-label="Get alerts"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="bell-icon pointer-events-none"
        >
          <g className="bell-body">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          </g>
          <g className="bell-clapper">
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </g>
        </svg>
      </button>

      {showTooltip && !open && (
        <span
          className="absolute right-0 bottom-full mb-2 whitespace-nowrap px-2.5 py-1 text-sm text-(--color-text-secondary) bg-white rounded-sm shadow-[0_2px_4px_-1px_rgba(20,20,20,0.06),0_1px_2px_-1px_rgba(20,20,20,0.04),0_0_0_1px_rgba(20,20,20,0.04),inset_0_0_0_1px_rgba(255,255,255,1)] pointer-events-none"
          role="tooltip"
        >
          Get alerts
        </span>
      )}

      <Popover open={open} onClose={onClose} anchorRef={buttonRef} className="w-72 p-4">
        {status === "success" ? (
          <p className="text-sm text-(--color-text-secondary)">{message}</p>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-(--color-text-primary)">
              Get daily paper summaries
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                className="w-full px-3 py-2 text-sm rounded-sm bg-(--color-surface-muted) border border-(--color-border) text-(--color-text-primary) placeholder:text-(--color-text-tertiary) outline-none focus:border-(--color-border-strong) transition-colors"
                style={{
                  borderColor:
                    status === "error"
                      ? "var(--color-danger-500)"
                      : undefined,
                }}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full px-4 py-2 text-sm font-medium rounded-sm bg-(--color-accent-500) text-(--color-text-on-accent) hover:bg-(--color-accent-600) active:bg-(--color-accent-700) disabled:opacity-50 transition-colors cursor-pointer"
              >
                {status === "submitting" ? "…" : "Subscribe"}
              </button>
            </form>
            {status === "error" && (
              <p className="mt-2 text-sm text-(--color-danger-500)">
                {message}
              </p>
            )}
          </>
        )}
      </Popover>
    </div>
  );
}

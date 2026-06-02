import type { Metadata } from "next";
import { VibeCheckClient } from "./_components/vibe-check-client";

export const metadata: Metadata = {
  title: "Vibe Check — Harley Siezar",
  description:
    "Browser-based automation and environment anomaly scorecard across browser artifacts, consistency checks, and fingerprint surfaces.",
  openGraph: {
    title: "Vibe Check",
    description: "Browser automation and environment anomaly scorecard",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vibe Check",
    description: "Browser automation and environment anomaly scorecard",
  },
};

export default function VibeCheckPage() {
  return <VibeCheckClient />;
}

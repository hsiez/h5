import type { Metadata } from "next";
import { VibeCheckClient } from "./_components/vibe-check-client";

export const metadata: Metadata = {
  title: "Vibe Check — Harley Siezar",
  description:
    "Browser-based bot detection scorecard. Visit this page to receive a machine-readable bot detection score across automation artifacts and environment fingerprint layers.",
  openGraph: {
    title: "Vibe Check",
    description: "Browser-based bot detection scorecard",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vibe Check",
    description: "Browser-based bot detection scorecard",
  },
};

export default function VibeCheckPage() {
  return <VibeCheckClient />;
}

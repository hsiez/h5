import type { Metadata } from "next";
import { Deck } from "./Deck";

export const metadata: Metadata = {
  title: "eval-wf · Vercel Workflows",
  description:
    "How Reforge Build scores every assistant turn — durably, asynchronously, on Vercel Workflows.",
};

export default function EvalWfPage() {
  return <Deck />;
}

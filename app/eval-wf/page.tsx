import type { Metadata } from "next";
import { Deck } from "./Deck";

export const metadata: Metadata = {
  title: "Evals with agency · Powered by Workflows",
  description:
    "A walkthrough of how Reforge Build evaluates the performance of chat-based agents using Workflows.",
  openGraph: {
    title: "Evals with agency · Powered by Workflows",
    description:
      "A walkthrough of how Reforge Build evaluates the performance of chat-based agents using Workflows.",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evals with agency · Powered by Workflows",
    description:
      "A walkthrough of how Reforge Build evaluates the performance of chat-based agents using Workflows.",
  },
};

export default function EvalWfPage() {
  return <Deck />;
}

import type { Metadata } from "next";
import { LoadoutWorld } from "./loadout-world";

export const metadata: Metadata = {
  title: "Loadout World — Harley Siezar",
  description: "An interactive, zoomable atlas of everyday equipment.",
};

export default function LoadoutPage() {
  return <LoadoutWorld />;
}

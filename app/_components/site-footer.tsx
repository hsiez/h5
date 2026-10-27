"use client";

import { usePathname } from "next/navigation";
import { Watermark } from "./watermark";

export function SiteFooter() {
  if (usePathname() === "/things") return null;

  return (
    <footer className="flex justify-center px-6 pb-2 pt-48 sm:pt-60">
      <Watermark className="w-full max-w-2xl text-[#f5f5ed]" />
    </footer>
  );
}

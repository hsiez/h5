import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Watermark } from "./_components/watermark";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const iowanOldStyle = localFont({
  src: "./fonts/iowan-old-style-regular.ttf",
  display: "swap",
  variable: "--font-iowan-old-style",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Harley Siezar",
  description: "AI Engineer working on Reforge Build.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${iowanOldStyle.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <footer className="flex justify-center px-6 pb-2 pt-48 sm:pt-60">
          <Watermark className="w-full max-w-2xl text-[#f5f5ed]" />
        </footer>
      </body>
    </html>
  );
}

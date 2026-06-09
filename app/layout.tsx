import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

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
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <footer className="flex justify-end px-6 pb-6 pt-16 sm:px-8 sm:pb-8">
          <div className="footer-logo-easter-egg aspect-square w-28 sm:w-32">
            <Image
              src="/h5-logo-letterpress-green.png"
              alt="h5"
              width={320}
              height={320}
              className="footer-logo-layer"
              loading="eager"
              style={{ "--logo-delay": "0ms" } as React.CSSProperties}
            />
            <Image
              src="/h5-logo-letterpress.png"
              alt=""
              width={1254}
              height={1254}
              className="footer-logo-layer"
              style={{ "--logo-delay": "1000ms" } as React.CSSProperties}
            />
            <Image
              src="/h5-logo-ascii.png"
              alt=""
              width={320}
              height={320}
              className="footer-logo-layer"
              style={{ "--logo-delay": "2000ms" } as React.CSSProperties}
            />
            <Image
              src="/h5-logo-bayer-8x8.png"
              alt=""
              width={320}
              height={320}
              className="footer-logo-layer"
              style={{ "--logo-delay": "3000ms" } as React.CSSProperties}
            />
            <Image
              src="/h5-logo-dots.png"
              alt=""
              width={320}
              height={320}
              className="footer-logo-layer"
              style={{ "--logo-delay": "4000ms" } as React.CSSProperties}
            />
          </div>
        </footer>
      </body>
    </html>
  );
}

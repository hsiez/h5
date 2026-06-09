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
        <footer className="flex justify-center px-6 pb-6 pt-32 sm:pb-8 sm:pt-40">
          <div className="flex w-full max-w-2xl items-end justify-between gap-4 sm:gap-6">
            <Image
              src="/h5-logo-sibling-02.png"
              alt="h5"
              width={958}
              height={964}
              loading="eager"
              className="h-auto w-14 shrink-0 object-contain sm:w-18"
            />
            <nav
              aria-label="Footer links"
              className="flex shrink-0 gap-2 text-sm leading-none whitespace-nowrap text-(--color-text-secondary) sm:gap-4 sm:text-base"
            >
              <a
                href="mailto:hey@h5.codes"
                className="hover:text-(--color-text-primary) hover:underline hover:underline-offset-4"
              >
                hey@h5.codes
              </a>
              <a
                href="https://x.com/hadasie"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--color-text-primary) hover:underline hover:underline-offset-4"
              >
                x
              </a>
              <a
                href="https://www.linkedin.com/in/harleysiezar"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--color-text-primary) hover:underline hover:underline-offset-4"
              >
                linkedin
              </a>
              <a
                href="/resume-2026.pdf"
                className="hover:text-(--color-text-primary) hover:underline hover:underline-offset-4"
              >
                resume
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

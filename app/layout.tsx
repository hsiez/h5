import type { Metadata } from "next";
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
          <div className="flex w-full max-w-2xl items-end">
            {false && (
              <span
                role="img"
                aria-label="h5"
                className="footer-logo-mark block shrink-0"
              />
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}

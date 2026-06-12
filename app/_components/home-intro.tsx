"use client";

import { useState } from "react";
import Image from "next/image";
import { detectVisitor, type VisitorGuess } from "@/lib/about-you/detect";

const SOCIAL_LINKS = [
  {
    label: "email",
    href: "mailto:hey@h5.codes",
  },
  {
    label: "twitter",
    href: "https://x.com/hadasie",
  },
  {
    label: "github",
    href: "https://github.com/hsiez",
  },
];

function greetingLine({ greeting, place, sharesTimezone }: VisitorGuess): string {
  const late = greeting === "still up";
  if (sharesTimezone) {
    return late
      ? "still up — and on pacific time, same as me. hope it's the good kind of late."
      : `${greeting} — and on pacific time, same as me. small world.`;
  }
  if (place) {
    return late
      ? `still up over in ${place}? hope it's the good kind of late.`
      : `${greeting} — or however it's looking over in ${place} right now.`;
  }
  return late
    ? "still up, whoever you are. hope it's the good kind of late."
    : `${greeting}, whoever you are.`;
}

function deviceLine({ device, browser }: VisitorGuess): string | null {
  if (device) return `and i hope the ${device} is treating you well.`;
  if (browser) return `reading along in ${browser}, i see — thanks for stopping by.`;
  return null;
}

export function HomeIntro() {
  const [open, setOpen] = useState(false);
  const [guess, setGuess] = useState<VisitorGuess | null>(null);

  function toggle() {
    // Detect lazily, the first time someone finds the easter egg, so the
    // homepage never runs WebGL probing for visitors who never click.
    setGuess((prev) => prev ?? detectVisitor());
    setOpen((o) => !o);
  }

  const device = guess ? deviceLine(guess) : null;

  return (
    <div>
      <h1 className="mb-4 text-3xl font-normal italic">hey, i&apos;m harley</h1>
      <figure className="home-newspaper__portrait">
        <Image
          src="/me-2-640.png"
          alt="Harley Siezar"
          width={640}
          height={486}
          sizes="(min-width: 48rem) 288px, 224px"
          preload
          className="home-newspaper__portrait-image"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/me-2-outline.svg"
          alt=""
          aria-hidden="true"
          className="home-newspaper__portrait-outline"
        />
        {/* Subtle easter egg: the portrait is a hello waiting to happen. */}
        <button
          type="button"
          onClick={toggle}
          aria-label="A little hello, just for you"
          aria-expanded={open}
          aria-controls="about-you-note"
          className="absolute inset-0 z-[3] cursor-pointer appearance-none border-0 bg-transparent p-0"
        />
      </figure>
      <p className="text-lg leading-relaxed text-(--color-text-secondary)">
        a builder based in <span className="seattle-word">seattle</span>. i&apos;ve
        been lucky enough to work on 0-to-1 teams, infrastructure for social
        programs, and beloved products with tons of users. i believe the most
        important ingredients in life are energy, care, and curiosity.
        here&apos;s to making impact and building
        relationships — cheers.
      </p>
      <nav
        aria-label="Social links"
        className="mt-[18px] flex flex-wrap gap-4 text-sm text-(--color-text-secondary) sm:text-base"
      >
        {SOCIAL_LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="underline underline-offset-4 hover:text-(--color-text-primary)"
          >
            {label}
          </a>
        ))}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="about-you-note"
          className="hover:text-(--color-text-primary)"
        >
          about you {open ? "↑" : "↓"}
        </button>
      </nav>

      <div
        id="about-you-note"
        className="clear-both grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {guess && (
            <article className="mt-6 rounded-lg border border-[rgba(20,20,20,0.055)] bg-(--color-surface-muted) px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <h2 className="mb-2 text-xl font-normal italic text-(--color-text-primary)">
                What I know about you?
              </h2>
              <p className="text-base leading-relaxed text-(--color-text-secondary)">
                {greetingLine(guess)}
                {device ? ` ${device}` : ""}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-(--color-text-tertiary)">
                all of that, just from your browser saying hello. want to even
                the score?{" "}
                <a
                  href="mailto:hey@h5.codes"
                  className="underline underline-offset-4 hover:text-(--color-text-secondary)"
                >
                  tell me more — send me a message!
                </a>
              </p>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";

const MISSIONS = [
  {
    role: "ai engineer",
    company: "miro",
  },
  {
    role: "ai engineer",
    company: "reforge",
    acquiredBy: "miro",
  },
  {
    role: "software engineer",
    company: "corbalt",
  },
  {
    role: "software engineer",
    company: "datarobot",
  },
  {
    role: "software engineer",
    company: "algorithmia",
    acquiredBy: "datarobot",
  },
];

const SIDE_QUESTS = [
  {
    name: "calm papers",
    href: "https://h5.codes/papers",
  },
  {
    name: "travel blog",
    href: "https://www.siezar.com/travel/cdmx",
  },
  {
    name: "evals with vercel workflows",
    href: "https://h5.codes/eval-wf",
  },
];

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

export default function Home() {
  return (
    <main className="flex flex-1 justify-center bg-(--color-background) px-6 pb-16">
      <article className="max-w-2xl">
        <section className="flex min-h-[calc(100svh-8rem)] flex-col justify-center py-16">
          <div>
            <h1 className="mb-4 text-3xl font-normal italic">
              hey, i&apos;m harley
            </h1>
            <figure className="home-newspaper__portrait">
              <Image
                src="/me-2.png"
                alt="Harley Siezar"
                width={968}
                height={736}
                className="home-newspaper__portrait-image"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/me-2-outline.svg"
                alt=""
                aria-hidden="true"
                className="home-newspaper__portrait-outline"
              />
            </figure>
            <p className="text-lg leading-relaxed text-(--color-text-secondary)">
              a builder based in <span className="seattle-word">seattle</span>.
              i&apos;ve been lucky enough to work on 0-to-1 teams,
              infrastructure for social programs, and beloved products with
              tons of users. throughout that journey i&apos;ve confirmed the
              most important ingredients in life are energy, care, and
              curiosity. here&apos;s to making impact and building relationships
              — cheers.
            </p>
            <nav
              aria-label="Social links"
              className="mt-[18px] flex gap-4 text-sm text-(--color-text-secondary) sm:text-base"
            >
              {SOCIAL_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                  className="underline underline-offset-4 hover:text-(--color-text-primary)"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section className="clear-both pt-16" aria-labelledby="missions">
          <h2 id="missions" className="mb-2 text-3xl font-normal">
            missions
          </h2>
          <ol className="border-t border-(--color-border) pt-4">
            {MISSIONS.map(({ role, company, acquiredBy }) => (
              <li
                key={company}
                className="grid gap-1 py-6 sm:grid-cols-2 sm:gap-6 sm:py-4"
              >
                <p className="flex items-baseline gap-4 text-lg font-medium text-(--color-text-primary) sm:inline-grid sm:w-fit sm:grid-cols-[6rem_auto]">
                  <span>{company}</span>
                  {acquiredBy && (
                    <span className="rounded-sm bg-[#e2e2da] px-2 font-light text-[#6f7068]">
                      acquired
                    </span>
                  )}
                </p>
                <p className="text-lg text-(--color-text-secondary)">{role}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pt-24" aria-labelledby="side-quests">
          <h2 id="side-quests" className="mb-2 text-3xl font-normal">
            side quests
          </h2>
          <ul className="border-t border-(--color-border) pt-4">
            {SIDE_QUESTS.map(({ name, href }) => (
              <li key={href} className="py-4">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline gap-2 text-lg text-(--color-text-primary)"
                >
                  <span className="group-hover:underline group-hover:underline-offset-4">
                    {name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-(--color-text-tertiary)"
                  >
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}

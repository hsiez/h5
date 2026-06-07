import Image from "next/image";

const CONTRIBUTIONS = [
  {
    role: "AI engineer",
    company: "Miro",
  },
  {
    role: "AI engineer",
    company: "Reforge",
    note: "acquired by Miro",
  },
  {
    role: "Software engineer",
    company: "Corbalt",
  },
  {
    role: "Software engineer",
    company: "DataRobot",
  },
  {
    role: "Software engineer",
    company: "Algorithmia",
    note: "acquired by DataRobot",
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
    name: "Evals with Vercel Workflows",
    href: "https://h5.codes/eval-wf",
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
          </div>
        </section>

        <section className="clear-both pt-16" aria-labelledby="contributions">
          <h2
            id="contributions"
            className="mb-6 text-3xl font-normal"
          >
            contributions
          </h2>
          <ol className="border-t border-(--color-border-strong)">
            {CONTRIBUTIONS.map(({ role, company, note }) => (
              <li
                key={company}
                className="grid gap-1 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6"
              >
                <p className="text-lg text-(--color-text-primary)">
                  {role} at <span className="font-medium">{company}</span>
                </p>
                {note && (
                  <p className="text-sm text-(--color-text-tertiary)">{note}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="pt-24" aria-labelledby="side-quests">
          <h2 id="side-quests" className="mb-6 text-3xl font-normal">
            side quests
          </h2>
          <ul className="border-t border-(--color-border-strong)">
            {SIDE_QUESTS.map(({ name, href }) => (
              <li key={href} className="py-4">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline justify-between gap-6 text-lg text-(--color-text-primary)"
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

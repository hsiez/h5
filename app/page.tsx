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

export default function Home() {
  return (
    <main className="flex flex-1 justify-center bg-(--color-background) px-6 pb-16">
      <article className="max-w-2xl">
        <section className="flex min-h-screen flex-col justify-center py-16">
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

        <section className="clear-both pt-32" aria-labelledby="contributions">
          <h2
            id="contributions"
            className="mb-6 text-3xl font-normal italic"
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
      </article>
    </main>
  );
}

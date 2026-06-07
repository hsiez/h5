import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-(--color-background) px-6 py-16">
      <article className="max-w-xl">
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
          i&apos;ve been lucky enough to work on 0-to-1 teams, infrastructure
          for social programs, and beloved products with tons of users.
          throughout that journey i&apos;ve confirmed the most important
          ingredients in life are energy, care, and curiosity. here&apos;s to
          making impact and building relationships — cheers.
        </p>
      </article>
    </main>
  );
}

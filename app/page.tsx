const PHOTO_SRC = "/about.jpg";

const PAST_COMPANIES = ["Reforge", "Cobalt", "DataRobot", "Algorithmia"];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16 bg-(--color-background)">
      <div className="flex flex-col md:flex-row gap-10 items-start max-w-content">
        <div className="shrink-0 w-[280px] h-[280px] rounded-2xl overflow-hidden bg-(--color-surface-muted) border border-(--color-border) shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PHOTO_SRC}
            alt="Harley Siezar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-4 max-w-prose pt-2">
          <p className="text-xl">
            <span className="font-semibold text-(--color-text-primary)">
              Harley Siezar
            </span>
            <span className="font-normal text-(--color-text-tertiary)">
              {" "}
              AI Engineer
            </span>
          </p>
          <p className="text-base text-(--color-text-secondary) leading-relaxed">
            I work on{" "}
            <span className="text-(--color-text-primary) font-medium">
              Reforge Build
            </span>
            , a prototyping tool — now part of{" "}
            <span className="text-(--color-text-primary) font-medium">
              Miro
            </span>
            .
          </p>
          <p className="text-sm text-(--color-text-tertiary) leading-relaxed">
            Previously{" "}
            {PAST_COMPANIES.map((name, i) => (
              <span key={name}>
                <span className="text-(--color-text-secondary)">{name}</span>
                {i < PAST_COMPANIES.length - 1 && (
                  <span className="px-1.5">·</span>
                )}
              </span>
            ))}
            .
          </p>
          <div className="flex items-center gap-3 text-sm pt-2">
            <a
              href="https://x.com/hadasie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
            >
              @hadasie
            </a>
            <span className="text-(--color-text-tertiary)">·</span>
            <a
              href="https://www.linkedin.com/in/harley-siezar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
            >
              LinkedIn
            </a>
            <span className="text-(--color-text-tertiary)">·</span>
            <a
              href="https://h5.codes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-text-primary) font-medium underline underline-offset-4 decoration-(--color-border-strong) hover:decoration-(--color-text-primary)"
            >
              h5.codes
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

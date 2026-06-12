import Image from "next/image";
import { HoverVideo } from "./_components/hover-video";

type SideQuestMedia =
  | {
      type: "image";
      src: string;
      alt: string;
    }
  | {
      type: "video";
      src: string;
      poster: string;
      alt: string;
    };

type SideQuest = {
  name: string;
  href: string;
  media: SideQuestMedia;
};

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

const SIDE_QUESTS: SideQuest[] = [
  {
    name: "calm papers",
    href: "https://h5.codes/papers",
    media: {
      type: "image",
      src: "/og-papers.png",
      alt: "Calm Papers preview",
    },
  },
  {
    name: "travel blog",
    href: "https://www.siezar.com/travel/cdmx",
    media: {
      type: "video",
      src: "/sidequest-travel.mp4",
      poster: "/sidequest-travel-poster.jpg",
      alt: "Travel writing preview",
    },
  },
  {
    name: "evals with vercel workflows",
    href: "https://h5.codes/eval-wf",
    media: {
      type: "video",
      src: "/sidequest-evals.mp4",
      poster: "/sidequest-evals-poster.jpg",
      alt: "Evals workflow preview",
    },
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

type Mission = (typeof MISSIONS)[number];

const PRESSABLE_PAPER_CLASS =
  "rounded-lg border border-[rgba(20,20,20,0.055)] bg-[#f5f5f1] shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_2px_0_0_rgba(255,255,255,0.45),inset_-2px_0_0_rgba(255,255,255,0.28),0_1px_2px_rgba(20,20,20,0.05),0_12px_28px_-22px_rgba(20,20,20,0.45)]";

function MissionRow({
  role,
  company,
  acquiredBy,
  isLast,
}: Mission & { isLast: boolean }) {
  return (
    <li className="px-5 sm:px-6">
      <div
        className={`flex items-baseline justify-between gap-x-4 py-4 ${
          isLast ? "" : "border-b border-[rgba(20,20,20,0.035)]"
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-normal text-(--color-text-primary)">
            {company}
          </h3>
          {acquiredBy && (
            <p className="rounded-sm bg-(--color-surface-sunken) px-2 text-sm text-(--color-text-tertiary)">
              acquired
            </p>
          )}
        </div>
        <p className="shrink-0 text-right text-base text-(--color-text-secondary)">
          <span className="sm:hidden">
            {role === "software engineer" ? "swe" : role}
          </span>
          <span className="hidden sm:inline">{role}</span>
        </p>
      </div>
    </li>
  );
}

function MissionsPanel() {
  return (
    <article className="rounded-lg border border-[rgba(20,20,20,0.045)] bg-[#fbfbf2] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <ol>
        {MISSIONS.map((mission, index) => (
          <MissionRow
            key={mission.company}
            {...mission}
            isLast={index === MISSIONS.length - 1}
          />
        ))}
      </ol>
    </article>
  );
}

function SideQuestThumbnail({ media }: { media: SideQuest["media"] }) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-[rgba(20,20,20,0.055)] bg-(--color-surface-muted) shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      {media.type === "video" ? (
        <HoverVideo
          src={media.src}
          poster={media.poster}
          label={media.alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes="(min-width: 672px) 624px, calc(100vw - 88px)"
          className="object-cover"
        />
      )}
    </div>
  );
}

function SideQuestRow({ name, href, media }: SideQuest) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${PRESSABLE_PAPER_CLASS} flex flex-col gap-3 px-2 pb-4 pt-2 text-(--color-text-primary)`}
      >
        <SideQuestThumbnail media={media} />
        <span className="flex items-baseline gap-2 pl-1">
          <span className="min-w-0 text-base font-medium leading-6">{name}</span>
          <span
            aria-hidden="true"
            className="shrink-0 text-base text-(--color-text-tertiary)"
          >
            ↗
          </span>
        </span>
      </a>
    </li>
  );
}

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
            </figure>
            <p className="text-lg leading-relaxed text-(--color-text-secondary)">
              a builder based in <span className="seattle-word">seattle</span>.
              i&apos;ve been lucky enough to work on 0-to-1 teams,
              infrastructure for social programs, and beloved products with
              tons of users. i believe the most important ingredients in life
              are energy, care, and curiosity. here&apos;s to making impact and
              building relationships — cheers.
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

        <section
          className="clear-both grid gap-y-4 pt-16"
          aria-labelledby="missions"
        >
          <h2
            id="missions"
            className="heading-trace text-lg font-normal"
          >
            missions
          </h2>
          <MissionsPanel />
        </section>

        <section
          className="grid gap-y-4 pt-24"
          aria-labelledby="side-quests"
        >
          <h2
            id="side-quests"
            className="heading-trace heading-trace--alt text-lg font-normal"
          >
            side quests
          </h2>
          <ul className="grid gap-4">
            {SIDE_QUESTS.map((sideQuest) => (
              <SideQuestRow key={sideQuest.href} {...sideQuest} />
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}

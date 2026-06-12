import Image from "next/image";
import { HoverVideo } from "./_components/hover-video";
import { HomeIntro } from "./_components/home-intro";

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
        className={`grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center ${
          isLast ? "" : "border-b border-[rgba(20,20,20,0.035)]"
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-normal text-(--color-text-primary)">
            {company}
          </h3>
          {acquiredBy && (
            <p className="rounded-sm border border-(--color-border) bg-(--color-surface-muted) px-2 text-sm text-(--color-text-tertiary)">
              acquired
            </p>
          )}
        </div>
        <p className="text-base text-(--color-text-secondary) sm:text-right">
          {role}
        </p>
      </div>
    </li>
  );
}

function MissionsPanel() {
  return (
    <article className="max-w-lg rounded-lg border border-[rgba(20,20,20,0.045)] bg-[#fbfbf2] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
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
          <HomeIntro />
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
          <ul className="grid max-w-lg gap-4">
            {SIDE_QUESTS.map((sideQuest) => (
              <SideQuestRow key={sideQuest.href} {...sideQuest} />
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}

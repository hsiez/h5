import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaperCard } from "@/app/_components/paper-card";
import { MOCK_DAILY_INDEX } from "../_fixtures";

function PapersDatePage({ date }: { date: string }) {
  const index = MOCK_DAILY_INDEX;
  const formatted = new Date(
    ...((date.split("-").map(Number) as [number, number, number]).map(
      (v, i) => (i === 1 ? v - 1 : v),
    ) as [number, number, number]),
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16 bg-(--color-background)">
      <div className="w-full max-w-reading flex flex-col gap-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-text-primary)">
            Papers
          </h1>
          <p className="text-sm text-(--color-text-tertiary)">
            {formatted} &middot; {index.papers.length} paper
            {index.papers.length !== 1 && "s"}
          </p>
        </header>

        <div className="flex flex-col gap-8">
          {index.papers.map((paper) => (
            <PaperCard key={paper.arxivId} paper={paper} expanded={false} />
          ))}
        </div>
      </div>
    </main>
  );
}

const meta: Meta<typeof PapersDatePage> = {
  title: "Pages/PapersDate",
  component: PapersDatePage,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PapersDatePage>;

export const Default: Story = {
  args: {
    date: "2026-05-06",
  },
};

export const EmptyState: Story = {
  name: "No papers",
  render: () => (
    <main className="flex flex-1 items-center justify-center px-6 py-16 bg-(--color-background) min-h-screen">
      <p className="text-(--color-text-tertiary)">No papers yet.</p>
    </main>
  ),
};

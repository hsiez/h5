import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaperCard } from "@/app/_components/paper-card";
import {
  MOCK_PAPER,
  MOCK_PAPER_MINIMAL,
  MOCK_PAPER_LONG_TITLE,
} from "../_fixtures";

const meta: Meta<typeof PaperCard> = {
  title: "Composites/PaperCard",
  component: PaperCard,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 768 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PaperCard>;

export const Default: Story = {
  args: {
    paper: MOCK_PAPER,
    audioSrc: "https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3",
  },
};

export const Minimal: Story = {
  name: "No GitHub / few authors",
  args: {
    paper: MOCK_PAPER_MINIMAL,
    audioSrc: "",
  },
};

export const LongTitle: Story = {
  name: "Long title + many authors",
  args: {
    paper: MOCK_PAPER_LONG_TITLE,
    audioSrc: "",
  },
};

export const Stacked: Story = {
  name: "Multiple cards (feed layout)",
  render: () => (
    <div className="flex flex-col gap-8">
      <PaperCard
        paper={MOCK_PAPER}
        audioSrc="https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3"
      />
      <PaperCard paper={MOCK_PAPER_MINIMAL} audioSrc="" />
      <PaperCard paper={MOCK_PAPER_LONG_TITLE} audioSrc="" />
    </div>
  ),
};

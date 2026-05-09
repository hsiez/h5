import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AudioPlayer } from "@/app/_components/audio-player";

const meta: Meta<typeof AudioPlayer> = {
  title: "Primitives/AudioPlayer",
  component: AudioPlayer,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AudioPlayer>;

export const Default: Story = {
  args: {
    src: "https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3",
  },
};

export const NoSource: Story = {
  name: "No audio loaded",
  args: {
    src: "",
  },
};

export const InCard: Story = {
  name: "Inside a card",
  args: {
    src: "https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3",
  },
  decorators: [
    (Story) => (
      <div
        className="p-6 rounded-lg border border-(--color-border) bg-(--color-background)"
        style={{ maxWidth: 600 }}
      >
        <p className="text-sm text-(--color-text-secondary) mb-4">
          Card context — player sits inside a bordered card.
        </p>
        <Story />
      </div>
    ),
  ],
};

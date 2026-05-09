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

export const Collapsed: Story = {
  args: {
    paper: MOCK_PAPER,
    expanded: false,
  },
};

export const Expanded: Story = {
  args: {
    paper: MOCK_PAPER,
    expanded: true,
  },
};

export const Minimal: Story = {
  name: "No GitHub / few authors",
  args: {
    paper: MOCK_PAPER_MINIMAL,
    expanded: false,
  },
};

export const LongTitle: Story = {
  name: "Long title + many authors",
  args: {
    paper: MOCK_PAPER_LONG_TITLE,
    expanded: true,
  },
};

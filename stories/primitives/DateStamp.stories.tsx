import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DateStamp } from "@/app/_components/date-stamp";

const meta: Meta<typeof DateStamp> = {
  title: "Primitives/DateStamp",
  component: DateStamp,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof DateStamp>;

export const Default: Story = {
  args: {
    date: new Date(2020, 7, 17),
    className: "w-24",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      <DateStamp date={new Date(2020, 7, 17)} className="w-16" />
      <DateStamp date={new Date(2020, 7, 17)} className="w-24" />
      <DateStamp date={new Date(2020, 7, 17)} className="w-32" />
    </div>
  ),
};

export const DifferentDates: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      <DateStamp date={new Date(2024, 0, 1)} className="w-24" />
      <DateStamp date={new Date(2025, 11, 25)} className="w-24" />
      <DateStamp date={new Date(2026, 4, 17)} className="w-24" />
    </div>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <div className="flex items-end gap-8 pl-8" style={{ maxWidth: 800 }}>
      <DateStamp date={new Date(2026, 4, 14)} className="shrink-0" />
      <div>
        <h1 className="font-serif text-3xl font-semibold text-(--color-text-primary)">
          Calm Papers
        </h1>
        <p className="mt-1 text-sm text-(--color-text-tertiary)">
          Summaries of the top 5 research papers on 🤗
        </p>
      </div>
    </div>
  ),
};

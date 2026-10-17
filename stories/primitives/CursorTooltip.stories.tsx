import type { ComponentProps, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CursorTooltip } from "@/app/_components/cursor-tooltip";

type CursorTooltipProps = ComponentProps<typeof CursorTooltip>;

function CursorTooltipPlayground(args: CursorTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const positionTooltip = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const offset = 16;
    const edge = 12;
    const left = Math.max(
      edge,
      Math.min(event.clientX + offset, window.innerWidth - tooltip.offsetWidth - edge),
    );
    const top = Math.max(
      edge,
      Math.min(event.clientY + offset, window.innerHeight - tooltip.offsetHeight - edge),
    );
    tooltip.style.setProperty("--cursor-x", `${left}px`);
    tooltip.style.setProperty("--cursor-y", `${top}px`);
  }, []);

  return (
    <div
      onPointerEnter={(event) => {
        positionTooltip(event);
        setVisible(true);
      }}
      onPointerMove={positionTooltip}
      onPointerLeave={() => setVisible(false)}
      style={{
        minHeight: "100vh",
        padding: 48,
        background: "#fffff7",
        color: "#707070",
        fontFamily: "var(--font-sans)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14 }}>Move the cursor anywhere in the canvas.</p>
      <CursorTooltip {...args} ref={tooltipRef} visible={visible} />
    </div>
  );
}

function StaticCursorTooltip(args: CursorTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    tooltip.style.setProperty("--cursor-x", "calc(50vw - 34px)");
    tooltip.style.setProperty("--cursor-y", "calc(50vh - 20px)");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fffff7" }}>
      <CursorTooltip {...args} ref={tooltipRef} visible />
    </div>
  );
}

const meta = {
  title: "Primitives/CursorTooltip",
  component: CursorTooltip,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    detail: "view",
    expanded: true,
    visible: true,
  },
  argTypes: {
    visible: { table: { disable: true } },
  },
} satisfies Meta<typeof CursorTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CursorFollowing: Story = {
  render: (args) => <CursorTooltipPlayground {...args} />,
};

export const Static: Story = {
  render: (args) => <StaticCursorTooltip {...args} />,
};

export const Dot: Story = {
  args: { expanded: false },
  render: (args) => <StaticCursorTooltip {...args} />,
};

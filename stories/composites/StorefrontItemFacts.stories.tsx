import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StorefrontItemFacts } from '../../app/things-for-you/storefront-item';
import { StorefrontStatusBadge } from '../../app/things-for-you/storefront-status-badge';
import styles from '../../app/things-for-you/storefront-item.module.css';

const meta = {
  title: 'Composites/Storefront Item Facts',
  component: StorefrontItemFacts,
} satisfies Meta<typeof StorefrontItemFacts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comparison: Story = {
  args: { size: 'Medium', condition: 'Gently used', measurements: [] },
  render: args => (
    <div style={{ display: 'grid', gap: 16, padding: 24 }}>
      <div className={styles.detailsRow}>
        <StorefrontStatusBadge status="available" />
        <StorefrontItemFacts {...args} />
      </div>
      <div className={styles.detailsRow}>
        <StorefrontStatusBadge status="available" />
        <StorefrontItemFacts size="9" condition="New" measurements={[]} />
      </div>
      <div className={styles.detailsRow}>
        <StorefrontStatusBadge status="available" />
        <StorefrontItemFacts size="L" condition="Gently used" measurements={[{ label: 'Chest', value: '44 in' }]} />
      </div>
    </div>
  ),
};

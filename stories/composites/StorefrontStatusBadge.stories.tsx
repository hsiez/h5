import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StorefrontStatusBadge } from '../../app/things-for-you/storefront-status-badge';
import styles from './storefront-status-badge.module.css';

type Direction = 'stateful' | 'pale' | 'raised' | 'wash' | 'outline';
type Status = 'available' | 'reserved' | 'claimed';

const directions: { id: Direction; name: string; description: string }[] = [
  { id: 'stateful', name: 'Vivid palette', description: 'Vivid green available, pink reserved, flat light gray claimed.' },
  { id: 'pale', name: 'Pale palette', description: 'Pale green available, pink reserved, flat light gray claimed.' },
  { id: 'raised', name: 'Quiet raised', description: 'Popup-style border, highlight, and a small shadow.' },
  { id: 'wash', name: 'Color wash', description: 'A soft color field with a lighter edge.' },
  { id: 'outline', name: 'Outline only', description: 'Transparent fill and a fine status-colored stroke.' },
];

const statuses: { id: Status; label: string; action: string }[] = [
  { id: 'available', label: 'Available', action: 'Claim for 1 coffee' },
  { id: 'reserved', label: 'Reserved', action: 'Notify me if available' },
  { id: 'claimed', label: 'Claimed', action: 'Passed on after coffee and a story' },
];

function BadgePreview({ direction, status }: { direction: Direction; status: Status }) {
  const current = statuses.find(item => item.id === status)!;

  return <div className={styles.card}>
    <div className={styles.detailsRow}>
      {direction === 'stateful' || direction === 'pale'
        ? <StorefrontStatusBadge status={status} variant={direction === 'pale' ? 'pale' : 'vivid'} />
        : <span className={`${styles.badge} ${styles[direction]} ${styles[status]}`}>{current.label}</span>}
      <span className={styles.dot} aria-hidden="true">·</span>
      <span className={styles.details}>medium</span>
      <span className={styles.dot} aria-hidden="true">·</span>
      <span className={styles.details}>gently used</span>
    </div>
    <div className={status === 'claimed' ? styles.claimedAction : styles.action}>{current.action}</div>
  </div>;
}

function BadgeGallery({ direction }: { direction?: Direction }) {
  return <div className={styles.gallery}>
    <h1>Storefront status badges</h1>
    <p className={styles.intro}>Five directions, each shown in the gray shopping card across all item states.</p>
    {directions.filter(item => !direction || item.id === direction).map(item => <section className={styles.section} key={item.id}>
      <div className={styles.heading}><h2>{item.name}</h2><p>{item.description}</p></div>
      <div className={styles.grid}>
        {statuses.map(status => <div key={status.id}>
          <span className={styles.caption}>{status.label}</span>
          <BadgePreview direction={item.id} status={status.id} />
        </div>)}
      </div>
    </section>)}
    <p className={styles.note}>Pending requests would use the Reserved badge; the underlying pending state remains separate.</p>
  </div>;
}

function AvailableContrastGallery() {
  return <div className={styles.gallery}>
    <h1>Storefront badge variants</h1>
    <p className={styles.intro}>Two available greens, with the same flat pink reserved and light gray claimed badges.</p>
    <div className={styles.contrastGrid}>
      <section>
        <div className={styles.heading}><h2>Vivid palette</h2></div>
        <p className={styles.caption}>Available: #27b25a / #072d16 · 5.45:1</p>
        <div className={styles.variantStack}>{statuses.map(status => <div key={status.id}>
          <span className={styles.caption}>{status.label}</span>
          <BadgePreview direction="stateful" status={status.id} />
        </div>)}</div>
      </section>
      <section>
        <div className={styles.heading}><h2>Pale palette</h2></div>
        <p className={styles.caption}>Available: #d9f0de / #126f32 · 5.22:1</p>
        <div className={styles.variantStack}>{statuses.map(status => <div key={status.id}>
          <span className={styles.caption}>{status.label}</span>
          <BadgePreview direction="pale" status={status.id} />
        </div>)}</div>
      </section>
    </div>
  </div>;
}

const meta: Meta<typeof BadgeGallery> = {
  title: 'Composites/Storefront Status Badge',
  component: BadgeGallery,
  parameters: { layout: 'fullscreen' },
  argTypes: { direction: { control: 'select', options: [undefined, 'stateful', 'pale', 'raised', 'wash', 'outline'] } },
};

export default meta;
type Story = StoryObj<typeof BadgeGallery>;

export const AllDirections: Story = {};
export const AvailableContrastOptions: Story = { name: 'Two Palette Variants', render: () => <AvailableContrastGallery /> };
export const StateSpecificSurfaces: Story = { args: { direction: 'stateful' } };
export const PalePalette: Story = { args: { direction: 'pale' } };
export const QuietRaised: Story = { args: { direction: 'raised' } };
export const ColorWash: Story = { args: { direction: 'wash' } };
export const OutlineOnly: Story = { args: { direction: 'outline' } };

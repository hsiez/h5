import { StatusPill } from '../_components/status-pill';
import styles from './loadout.module.css';

export function ThingsHomeHeading({ subtitle }: { subtitle: string }) {
  return <header className={styles.homeHeading}>
    <p className={styles.homeIntro}>{subtitle}</p>
  </header>;
}

const categories = [
  { id: 'edc', name: 'Every day carry' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'things-for-you', name: 'For you' },
];

export function ThingsCategoryLinks({ regions, onSelect }: {
  regions: readonly { id: string; name: string }[];
  onSelect: (id: string) => void;
}) {
  return <nav className={styles.homeCategories} aria-label="Categories">
    {categories.map(category => {
      const region = regions.find(region => region.id === category.id || region.name.toLowerCase() === category.name.toLowerCase());
      return region
        ? <button type="button" key={category.id} data-region-id={region.id} onClick={() => onSelect(region.id)}>{category.name}<span aria-hidden="true">↗</span></button>
        : <span key={category.id} className={styles.upcomingCategory}>{category.name}<StatusPill>Coming soon</StatusPill></span>;
    })}
  </nav>;
}

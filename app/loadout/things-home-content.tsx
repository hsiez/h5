import { homeCategories } from './home-categories';
import { StatusPill } from '../_components/status-pill';
import styles from './loadout.module.css';

export function ThingsHomeHeading({ subtitle }: { subtitle: string }) {
  return <header className={styles.homeHeading}>
    <p className={styles.homeIntro}>{subtitle}</p>
  </header>;
}

export function ThingsCategoryLinks({ regions, onSelect }: {
  regions: readonly { id: string; name: string }[];
  onSelect: (id: string) => void;
}) {
  return <nav className={styles.homeCategories} aria-label="Categories">
    {homeCategories(regions).map(category => {
      const regionId = category.regionId;
      return regionId
        ? <button type="button" key={category.id} data-region-id={regionId} onClick={() => onSelect(regionId)}>{category.name}<span aria-hidden="true">↗</span></button>
        : <span key={category.id} className={styles.upcomingCategory}>{category.name}<StatusPill>Coming soon</StatusPill></span>;
    })}
  </nav>;
}

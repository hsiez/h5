import type { ReactNode } from 'react';
import { homeCategories } from './home-categories';
import { StatusPill } from '../_components/status-pill';
import { IntentLink } from '../_components/intent-link';
import { regionHref } from './catalog-navigation';
import styles from './loadout.module.css';

export function ThingsHomeHeading({ subtitle }: { subtitle: ReactNode }) {
  return <header className={styles.homeHeading}>
    <p className={styles.homeIntro}>{subtitle}</p>
  </header>;
}

export function ThingsCategoryLinks({ regions, preview = false }: {
  regions: readonly { id: string; name: string }[];
  preview?: boolean;
}) {
  return <nav className={styles.homeCategories} aria-label="Categories">
    {homeCategories(regions).map(category => {
      const regionId = category.regionId;
      return regionId
        ? <IntentLink key={category.id} data-region-id={regionId} href={regionHref(regionId, preview)}>{category.name}<span aria-hidden="true">↗</span></IntentLink>
        : <span key={category.id} className={styles.upcomingCategory}>{category.name}<StatusPill>Coming soon</StatusPill></span>;
    })}
  </nav>;
}

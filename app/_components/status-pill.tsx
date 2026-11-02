import type { ReactNode } from 'react';
import styles from './status-pill.module.css';

export function StatusPill({ children }: { children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>;
}

import styles from './storefront-status-badge.module.css';

type Status = 'available' | 'pending' | 'reserved' | 'claimed';
type Variant = 'vivid' | 'pale';

export function StorefrontStatusBadge({ status, variant = 'pale' }: { status: Status; variant?: Variant }) {
  const visibleStatus = status === 'pending' ? 'reserved' : status;
  const label = visibleStatus.charAt(0).toUpperCase() + visibleStatus.slice(1);

  return <span className={`${styles.badge} ${styles[variant]} ${styles[visibleStatus]}`}>{label}</span>;
}

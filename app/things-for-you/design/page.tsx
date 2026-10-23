import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StorefrontItem, type StorefrontButtonVariant, type StorefrontItemStatus } from '../storefront-item';
import { storefrontItemSample } from '../storefront-item-sample';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Storefront item design — local preview',
  robots: { index: false, follow: false },
};

const statuses: StorefrontItemStatus[] = ['available', 'pending', 'reserved', 'claimed'];

export default async function StorefrontItemDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; button?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { status: requestedStatus, button } = await searchParams;
  const status = statuses.find(candidate => candidate === requestedStatus) ?? 'available';
  const buttonVariant: StorefrontButtonVariant = button === 'overlay' ? 'overlay' : 'layered';
  const previewHref = (nextStatus: StorefrontItemStatus, nextButton: StorefrontButtonVariant) => {
    const params = new URLSearchParams();
    if (nextStatus !== 'available') params.set('status', nextStatus);
    if (nextButton === 'overlay') params.set('button', nextButton);
    const query = params.toString();
    return `/things-for-you/design${query ? `?${query}` : ''}`;
  };

  return <main>
    <nav className={styles.previewNav} aria-label="Preview item state">
      <span>Local design preview</span>
      <div>
        {statuses.map(candidate => <Link key={candidate} href={previewHref(candidate, buttonVariant)}
          aria-current={candidate === status ? 'page' : undefined}>
          {candidate}
        </Link>)}
      </div>
      <div aria-label="Button design">
        <Link href={previewHref(status, 'layered')} aria-current={buttonVariant === 'layered' ? 'page' : undefined}>Layered button</Link>
        <Link href={previewHref(status, 'overlay')} aria-current={buttonVariant === 'overlay' ? 'page' : undefined}>Earlier overlay</Link>
      </div>
    </nav>
    <StorefrontItem key={`${status}-${buttonVariant}`} {...storefrontItemSample} status={status} buttonVariant={buttonVariant} />
  </main>;
}

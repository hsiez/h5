import type { Metadata } from 'next';
import { connection } from 'next/server';
import { db } from '@/lib/storefront/db';
import { StorefrontItem } from './storefront-item';
import styles from './things-for-you.module.css';

export const metadata: Metadata = {
  title: 'Things for you — Harley Siezar',
  description: 'Objects available for a coffee and a story.',
};

type Item = {
  slug: string;
  title: string;
  description: string;
  size_label: string | null;
  condition_note: string | null;
  measurements: Record<string, string>;
  status: 'available' | 'pending' | 'reserved' | 'claimed';
  image: string | null;
  image_alt: string | null;
};

export default async function ThingsForYouPage() {
  await connection();
  if (process.env.VERCEL_ENV === 'preview') await ensurePreviewItem();
  const result = await db().query<Item>(`SELECT i.slug,i.title,i.description,i.size_label,i.condition_note,i.measurements,i.status,
    m.blob_path AS image,m.alt_text AS image_alt
    FROM storefront_items i
    LEFT JOIN LATERAL (SELECT blob_path,alt_text FROM storefront_item_media
      WHERE item_id=i.id ORDER BY sort_order,created_at LIMIT 1) m ON true
    WHERE i.published_at IS NOT NULL ORDER BY i.published_at DESC`);

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Loadout / Things for you</p>
        <h1>Things for you</h1>
        <p className={styles.intro}>A few things ready for another life. The price is a coffee and a story, in Seattle.</p>
      </header>
      <div className={styles.items}>
        {result.rows.length ? result.rows.map(item => <StorefrontItem key={item.slug} item={item} />)
          : <p className={styles.empty}>Nothing is available just yet.</p>}
      </div>
    </div>
  </main>;
}

async function ensurePreviewItem() {
  const item = await db().query<{id:string}>(`INSERT INTO storefront_items
    (slug,title,description,size_label,condition_note,measurements,status,published_at)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,'available',now())
    ON CONFLICT (slug) DO UPDATE SET published_at=COALESCE(storefront_items.published_at,now())
    RETURNING id`, [
      'demo-prototype-cap',
      'Prototype cap · demo',
      'A sample listing for testing the coffee-and-a-story exchange. This cap image comes from the Everyday Carry collection; no physical item is being offered in this test.',
      'One size',
      'Demo item — no handoff required',
      JSON.stringify({Fit:'Adjustable'}),
    ]);
  await db().query(`INSERT INTO storefront_item_media(item_id,blob_path,alt_text,sort_order)
    VALUES($1,$2,$3,0) ON CONFLICT (blob_path) DO NOTHING`, [
      item.rows[0].id, '/loadout/hat.png', 'Black Prototype cap photographed from the front',
    ]);
}

import type { Metadata } from 'next';
import { connection } from 'next/server';
import { db } from '@/lib/storefront/db';
import { StorefrontItem, type StorefrontItemStatus } from './storefront-item';
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
  status: StorefrontItemStatus;
  photos: { src: string; alt: string }[];
  handoff_photo: string | null;
  handoff_alt: string | null;
};

export default async function ThingsForYouPage() {
  await connection();
  if (process.env.VERCEL_ENV === 'preview') await ensurePreviewItem();
  const result = await db().query<Item>(`SELECT i.slug,i.title,i.description,i.size_label,i.condition_note,i.measurements,i.status,
    COALESCE(m.photos, '[]'::json) AS photos,
    h.photo_blob_path AS handoff_photo,h.photo_alt_text AS handoff_alt
    FROM storefront_items i
    LEFT JOIN LATERAL (SELECT json_agg(json_build_object('src',blob_path,'alt',alt_text) ORDER BY sort_order,created_at) AS photos
      FROM storefront_item_media WHERE item_id=i.id) m ON true
    LEFT JOIN item_handoffs h ON h.item_id=i.id
    WHERE i.published_at IS NOT NULL ORDER BY i.published_at DESC`);

  return <main className={styles.page}>
    <header className={styles.header}>
      <h1>Things for you</h1>
      <p className={styles.intro}>A few things ready for another life. The price is a coffee and a story, in Seattle.</p>
    </header>
    <div className={styles.items}>
      {result.rows.length ? result.rows.map(item => <StorefrontItem key={item.slug}
          slug={item.slug}
          title={item.title}
          story={item.description}
          reason=""
          photos={item.photos}
          size={item.size_label || ''}
          condition={item.condition_note || ''}
          measurements={Object.entries(item.measurements || {}).map(([label, value]) => ({ label, value }))}
          status={item.status}
          owner={item.handoff_photo ? {
            name: 'its new owner',
            photo: { src: item.handoff_photo, alt: item.handoff_alt || 'The new owner at the handoff' },
            coffeeStory: 'A coffee and a story shared in Seattle.',
          } : undefined}
      />)
        : <p className={styles.empty}>Nothing is available just yet.</p>}
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

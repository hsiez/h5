import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ReviewEditor, fromReview } from '../../app/admin/review-editor';
import { ITEM_REVIEWS } from '../../app/loadout/reviews';
import styles from '../../app/admin/panel.module.css';

function EditorPreview({ storefront = false }: { storefront?: boolean }) {
  const [review, setReview] = useState(() => storefront
    ? { ...fromReview(null), enabled: true, about: 'this jacket because it is too stiff for my liking.' }
    : fromReview(ITEM_REVIEWS.Coat));
  return <main className={styles.admin}><div className={styles.editor}>
    <h1>{storefront ? 'Write about this item' : 'Write a review'}</h1>
    <ReviewEditor value={review} onChange={setReview} photos={[]} storefront={storefront} />
  </div></main>;
}

const meta = { title: 'Composites/Admin Review Editor', component: EditorPreview, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof EditorPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editing: Story = {};
export const Storefront: Story = { args: { storefront: true } };

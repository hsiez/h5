import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoadoutWorld } from '../../app/loadout/loadout-world';
import { ItemNavigation } from '../../app/things/item-navigation';
import { storefrontItemSample } from '../../app/things-for-you/storefront-item-sample';
import type { Catalog, CatalogItem } from '../../lib/catalog/types';

const meta = {
  title: 'Pages/Item Focus',
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function FocusPreview({ storefront }: { storefront: boolean }) {
  const regionId = storefront ? 'things-for-you' : 'edc';
  const name = storefront ? 'For You' : 'Everyday Carry';
  const sample = storefrontItemSample;
  const item: CatalogItem = {
    id: 'storybook-cap', slug: 'storybook-cap', regionId,
    title: sample.title, model: sample.title, brand: 'Reforge',
    description: sample.story,
    photos: sample.photos,
    size: storefront ? 'One size' : '',
    condition: storefront ? 'Gently used' : '',
    measurements: {},
    review: {
      title: sample.title,
      about: [
        [storefront ? 'this cap because I reach for a different one now.' : 'this cap while working at Reforge.'],
        [sample.story],
        ['The brim has softened over time, and the strap still holds its adjustment.'],
      ],
      pros: ['how easy it is to pack and wear.'],
      cons: ['The fabric has faded slightly.'],
    },
    sortOrder: 0, legacyKey: null, status: 'available',
    publicationStatus: 'published', revision: 0, draft: null,
  };
  const catalog: Catalog = {
    regions: [{ id: regionId, name, heading: name, description: '', kind: storefront ? 'storefront' : 'review', publication_status: 'published', sort_order: 0 }],
    items: [item],
  };

  return <>
    <ItemNavigation regionId={regionId} slug={item.slug} claimable={storefront} />
    <LoadoutWorld catalog={catalog} dedicatedItem preview initialSelection={{ regionId, itemIndex: 0 }} />
  </>;
}

export const EverydayCarry: Story = { render: () => <FocusPreview storefront={false} /> };
export const ForYou: Story = { render: () => <FocusPreview storefront /> };

import type { ItemReview } from '@/app/loadout/reviews';
import type { StorefrontItemProps } from '@/app/things-for-you/storefront-item';
export type Publication = 'draft' | 'published' | 'archived';
export type CatalogRegion = { id:string; name:string; heading:string; description:string; kind:'review'|'storefront'; publication_status:Publication; sort_order:number };
export type Photo = { src:string; alt:string; stippleSrc?:string };
export type ItemDraft = { slug:string; title:string; regionId:string; description:string; size:string; condition:string; measurements:Record<string,string>; photos:Photo[]; review:ItemReview|null; sortOrder:number };
export type CatalogItem = ItemDraft & { id:string; publicationStatus:Publication; status:StorefrontItemProps['status']; legacyKey:string|null; revision:number; draft:ItemDraft|null; owner?:StorefrontItemProps['owner'] };
export type Catalog = { regions:CatalogRegion[]; items:CatalogItem[] };

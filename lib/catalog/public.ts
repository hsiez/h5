import seed from '@/db/seeds/catalog.json';
import type { Catalog, CatalogItem } from './types';
import { getCatalog } from './repository';
export function fallbackCatalog():Catalog {
 return {regions:[{id:'edc',name:'Everyday carry',heading:'Things I carry everyday',description:'',kind:'review',publication_status:'published',sort_order:0},{id:'things-for-you',name:'Things for you',heading:'Things for you',description:'A coffee and a story, in Seattle.',kind:'storefront',publication_status:'published',sort_order:1}],
 items:seed.map((item,index)=>({...item,id:`legacy-${index}`,publicationStatus:'published',status:'available',revision:0,draft:null})) as CatalogItem[]};
}
export async function publicCatalog() {
 if(!process.env.DATABASE_URL) return fallbackCatalog();
 try {return await getCatalog();} catch(error) {
  if(error && typeof error==='object' && 'code' in error && ['42P01','42703'].includes(String(error.code))) { console.warn('Catalog migration is not installed; showing existing reviews.'); return fallbackCatalog(); }
  throw error;
 }
}

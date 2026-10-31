import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validSession, SESSION_COOKIE } from '@/lib/admin/auth';
import { getCatalog } from '@/lib/catalog/repository';
import { LoadoutWorld } from '@/app/loadout/loadout-world';
import { previewSelection } from '@/app/loadout/catalog-navigation';
export const metadata={title:'Private preview',robots:{index:false,follow:false}};
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ region?: string; item?: string }> }) {
 if(!await validSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/admin');
 const catalog=await getCatalog(true);
 catalog.items=catalog.items.map(item=>({...item,...item.draft,draft:null}));
 const selection = previewSelection(catalog, await searchParams);
 return <><div style={{position:'fixed',bottom:12,left:12,zIndex:100,background:'#fff',border:'1px solid #ddd',padding:'8px 12px',borderRadius:8,fontSize:12}}>Private draft preview · Adoption submissions are simulated · <a href="/admin">Back to admin</a></div><LoadoutWorld key={`${selection.regionId}:${selection.itemIndex}`} catalog={catalog} preview dedicatedItem={selection.itemIndex >= 0} initialSelection={selection}/></>;
}

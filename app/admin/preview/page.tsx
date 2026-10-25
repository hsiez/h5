import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validSession, SESSION_COOKIE } from '@/lib/admin/auth';
import { getCatalog } from '@/lib/catalog/repository';
import { LoadoutWorld } from '@/app/loadout/loadout-world';
export const metadata={title:'Private preview',robots:{index:false,follow:false}};
export default async function PreviewPage() {
 if(!await validSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/admin');
 const catalog=await getCatalog(true);
 catalog.items=catalog.items.map(item=>({...item,...item.draft,draft:null}));
 return <><div style={{position:'fixed',bottom:12,left:12,zIndex:100,background:'#fff',border:'1px solid #ddd',padding:'8px 12px',borderRadius:8,fontSize:12}}>Private draft preview · Adoption submissions are simulated · <a href="/admin">Back to admin</a></div><LoadoutWorld catalog={catalog} preview/></>;
}

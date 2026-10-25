import { cookies } from 'next/headers';
import { SESSION_COOKIE, validSession } from '@/lib/admin/auth';
import { AdminDashboard, AdminLogin } from './panel';
export const metadata={title:'Admin — Harley Siezar',robots:{index:false,follow:false}};
export default async function AdminPage() {
 const session=(await cookies()).get(SESSION_COOKIE)?.value;
 const authenticated=await validSession(session);
 return authenticated?<AdminDashboard/>:<AdminLogin configured={!!process.env.ADMIN_PASSWORD_HASH}/>;
}

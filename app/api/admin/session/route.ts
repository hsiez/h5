import { NextResponse } from 'next/server';
import { login, checkOrigin, digest, sessionToken, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/admin/auth';
import { db } from '@/lib/storefront/db';
import { failure } from '@/lib/storefront/http';
export async function POST(request:Request) {
  try {
    const {password}=await request.json();
    const token=await login(request,password);
    const response=NextResponse.json({ok:true});
    response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:SESSION_SECONDS});
    response.headers.set('Cache-Control','no-store');
    return response;
  } catch(error) { return failure(error); }
}
export async function DELETE(request:Request) {
  try {
    checkOrigin(request);
    const token=sessionToken(request);
    if (token) await db().query('DELETE FROM admin_sessions WHERE token_hash=$1',[digest(token)]);
    const response=NextResponse.json({ok:true});
    response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
    return response;
  } catch(error) { return failure(error); }
}

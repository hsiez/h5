import { FlowError, verifyAvailability } from '@/lib/storefront/core';
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'};
function page(content:string,status=200) {
  return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Things · Notification</title><style>body{margin:0;background:#f4f4f1;color:#222;font:16px/1.6 Georgia,'Times New Roman',serif}main{box-sizing:border-box;max-width:400px;margin:64px auto;padding:24px;background:#fff;border-radius:20px}h1{font-size:28px;line-height:1.2;font-weight:400}button{padding:12px 20px;background:#424242;color:#fff;border:1px solid #222;border-radius:8px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2580e0;outline-offset:4px}@media(max-width:440px){main{margin:32px 16px}}</style><main>${content}</main></html>`,{status,headers});
}
export async function GET() {
  return page('<h1>Confirm your notification</h1><p>We’ll email you once if the item becomes available again. This is not a waitlist.</p><form method="post"><button>Confirm notification</button></form>');
}
export async function POST(_request:Request,{params}:{params:Promise<{token:string}>}) {
  try {
    await verifyAvailability((await params).token);
    return page('<h1>Notification confirmed</h1><p>You can close this page.</p>');
  }catch(error){
    if(error instanceof FlowError)return page('<h1>This confirmation link has expired</h1><p>Request another notification from the item page.</p>',410);
    console.error('Notification verification failed',error);
    return page('<h1>Please try again</h1><p>We could not confirm your notification yet.</p>',503);
  }
}

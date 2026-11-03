import { createHash } from 'node:crypto';
import { transaction } from './db';
import { FlowError, normalEmail } from './core';
export async function budget(entries: {key:string;limit:number;seconds:number}[]) {
 await transaction(async client=>{
  for(const entry of entries.sort((a,b)=>a.key.localeCompare(b.key))) {
   const key=createHash('sha256').update(entry.key).digest('hex');
   const result=await client.query<{hits:number}>(`INSERT INTO storefront_rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN storefront_rate_limits.expires_at<now() THEN 1 ELSE storefront_rate_limits.hits+1 END,expires_at=CASE WHEN storefront_rate_limits.expires_at<now() THEN now()+$2*interval '1 second' ELSE storefront_rate_limits.expires_at END RETURNING hits`,[key,entry.seconds]);
   if(result.rows[0].hits>entry.limit)throw new FlowError('Too many requests. Please try again later.',429);
  }
 });
}
export async function admit(request:Request,slug:string,requireAcknowledgement=false) {
 const origin=request.headers.get('origin');
 const url=new URL(request.url);
 const host=request.headers.get('host');
 const hostOrigin=host && /^[a-z0-9.:[\]-]+$/i.test(host) ? `${url.protocol}//${host}` : null;
 if(!origin || (origin!==url.origin && origin!==hostOrigin))throw new FlowError('Request origin is not allowed',403);
 if(!(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()==='application/json'))throw new FlowError('Use JSON',415);
 if(Number(request.headers.get('content-length')||0)>4096)throw new FlowError('Request too large',413);
 // Rate-limit before parsing or querying inventory. Vercel overwrites XFF at its edge.
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 await budget([{key:`public:ip:${ip}`,limit:10,seconds:900},{key:'public:global',limit:200,seconds:3600}]);
 const reader=request.body?.getReader();let text='';let size=0;
 if(!reader)throw new FlowError('Missing body');
 try {const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096)throw new FlowError('Request too large',413);text+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
 let body;try{body=JSON.parse(text);}catch{throw new FlowError('Invalid JSON');}
 if(requireAcknowledgement && body?.acknowledged!==true)throw new FlowError('Please acknowledge the no-resale condition.');
 const email=normalEmail(body?.email);
 if(!/^[a-z0-9-]{1,100}$/.test(slug))throw new FlowError('Invalid item');
 await budget([{key:`public:email:${email}`,limit:3,seconds:3600},{key:`public:item:${slug}`,limit:60,seconds:3600}]);
 return email;
}

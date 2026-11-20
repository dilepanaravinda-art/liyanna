/** Server-side sandbox adapter. No route or worker activates this module. */
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {invoiceIssuedV1} from './contracts';
const receipt=z.object({mode:z.literal('staged-review-only'),receiptId:z.string().uuid(),duplicate:z.boolean(),postingAuthorized:z.literal(false),sourceAuthenticated:z.literal(false),ledgerEntriesCreated:z.literal(0),deliveryAuthenticated:z.literal(true),sourceOwnershipVerified:z.literal(false)});
export type SandboxSenderConfig={enabled:boolean;sandbox:boolean;endpoint:string;allowedOrigin:string;credential:string;timeoutMs?:number};
export type DeliveryResult={status:'staged';receiptId:string;duplicate:boolean;payloadHash:string;postingAuthorized:false}|{status:'blocked'|'retry'|'review';code:string;postingAuthorized:false};
const failure=(status:'blocked'|'retry'|'review',code:string):DeliveryResult=>({status,code,postingAuthorized:false});
export async function sendSandboxReview(payload:unknown,config:SandboxSenderConfig,fetcher:typeof fetch):Promise<DeliveryResult>{
 if(!config.enabled||!config.sandbox)return failure('blocked','SANDBOX_DISABLED');
 let endpoint:URL;
 try{
  endpoint=new URL(config.endpoint);const allowed=new URL(config.allowedOrigin);
  if(endpoint.protocol!=='https:'||endpoint.origin!==allowed.origin||allowed.href!==allowed.origin+'/'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/api/integrations/liyanna/events'||isIP(endpoint.hostname.replace(/^\[|\]$/g,''))||!endpoint.hostname.includes('.')||/\.(localhost|local|internal)$/.test(endpoint.hostname))return failure('blocked','DESTINATION_NOT_ALLOWED');
 }catch{return failure('blocked','DESTINATION_NOT_ALLOWED');}
 if(!/^fls_[A-Za-z0-9_-]{43}$/.test(config.credential))return failure('blocked','CREDENTIAL_REQUIRED');
 const parsed=invoiceIssuedV1.safeParse(payload);if(!parsed.success)return failure('blocked','INVALID_EVENT');
 const body=JSON.stringify(parsed.data);if(new TextEncoder().encode(body).length>65536)return failure('blocked','EVENT_TOO_LARGE');
 const timeout=config.timeoutMs??10000;if(!Number.isInteger(timeout)||timeout<1||timeout>10000)return failure('blocked','INVALID_TIMEOUT');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetcher(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.credential},body,redirect:'manual',signal:controller.signal,cache:'no-store',credentials:'omit'});
  if(response.status>=300&&response.status<400)return failure('blocked','REDIRECT_REJECTED');
  if(response.status===401||response.status===403)return failure('blocked','CREDENTIAL_OR_SCOPE_REJECTED');
  if(response.status===409)return failure('review','EVENT_CONFLICT');
  if(response.status===429||response.status>=500)return failure('retry','TEMPORARY_RECEIVER_FAILURE');
  if(!response.ok)return failure('review','EVENT_REJECTED');
  if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return failure('review','INVALID_RECEIPT');
  const reader=response.body?.getReader();if(!reader)return failure('review','INVALID_RECEIPT');
  let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();return failure('review','INVALID_RECEIPT');}chunks.push(part.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{return failure('review','INVALID_RECEIPT');}
  const checked=receipt.safeParse(value);if(!checked.success)return failure('review','INVALID_RECEIPT');
  return {status:'staged',receiptId:checked.data.receiptId,duplicate:checked.data.duplicate,payloadHash:createHash('sha256').update(body).digest('hex'),postingAuthorized:false};
 }catch{return failure('retry','NETWORK_OR_TIMEOUT');}
 finally{clearTimeout(timer);}
}

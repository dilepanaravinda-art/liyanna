/** Trusted-server composition only; no HTTP route, credentials or worker is activated. */
import {z} from 'zod';
import {invoiceIssuedV1} from './contracts';
import {sendSandboxReview,type SandboxSenderConfig,type DeliveryResult} from './sandbox-sender';
const claimSchema=z.object({status:z.literal('claimed'),businessId:z.string().uuid(),event:invoiceIssuedV1,destination:z.object({companyId:z.string().min(1),currency:z.string().regex(/^[A-Z]{3}$/)}),destinationRevision:z.number().int().positive(),leaseToken:z.string().uuid(),attempt:z.number().int().min(1).max(8)});
export type DispatchClaim=z.infer<typeof claimSchema>;
export interface DispatchDatabase{query<T>(sql:string,params:unknown[]):Promise<{rows:T[]}>}
export interface DispatchRepository{
 claim(businessId:string,preparationId:string):Promise<unknown>;
 authorize(businessId:string,preparationId:string,lease:string):Promise<boolean>;
 finish(preparationId:string,lease:string,result:DeliveryResult):Promise<void>;
}
/** Database must use the restricted dispatcher login. Never use browser RPC or service-role keys here. */
export function postgresDispatchRepository(db:DispatchDatabase):DispatchRepository{
 return {
  async claim(business,id){return (await db.query<{value:unknown}>('select public.liyanna_claim_review_dispatch($1,$2) value',[business,id])).rows[0]?.value;},
  async authorize(business,id,lease){return (await db.query<{value:boolean}>('select public.liyanna_authorize_review_dispatch($1,$2,$3) value',[business,id,lease])).rows[0]?.value===true;},
  async finish(id,lease,result){await db.query('select public.liyanna_finish_review_dispatch($1,$2,$3::jsonb)',[id,lease,JSON.stringify(result)]);},
 };
}
export async function dispatchSandboxOnce(input:{enabled:boolean;sandbox:boolean;businessId:string;preparationId:string},deps:{repository:DispatchRepository;resolveCredential:(claim:DispatchClaim)=>Promise<{sourceBusinessId:string;companyId:string;destinationRevision:number;currency:string;sender:SandboxSenderConfig}>;fetcher:typeof fetch}){
 const blocked=(code:string)=>({status:'blocked',code,postingAuthorized:false} as const);
 if(!input.enabled||!input.sandbox)return blocked('SANDBOX_DISABLED');
 if(!z.string().uuid().safeParse(input.businessId).success||!z.string().uuid().safeParse(input.preparationId).success)return blocked('INVALID_SCOPE');
 let raw:unknown;try{raw=await deps.repository.claim(input.businessId,input.preparationId);}catch{return blocked('CLAIM_UNAVAILABLE');}
 const parsed=claimSchema.safeParse(raw);
 if(!parsed.success){const state=z.object({status:z.enum(['busy','waiting','staged','blocked','review'])}).safeParse(raw);return {status:state.success?state.data.status:'blocked',code:state.success?'NO_DISPATCH_REQUIRED':'INVALID_CLAIM',postingAuthorized:false};}
 const claim=parsed.data;
 if(claim.businessId!==input.businessId||claim.event.businessId!==input.businessId||claim.event.tenantId!==input.businessId||claim.event.eventId!==input.preparationId)return blocked('CLAIM_SCOPE_MISMATCH');
 let outcome:DeliveryResult;
 try{
  const credential=await deps.resolveCredential(claim);
  if(credential.sourceBusinessId!==input.businessId||credential.companyId!==claim.destination.companyId||credential.destinationRevision!==claim.destinationRevision||credential.currency!==claim.destination.currency||claim.event.currency!==credential.currency||!credential.sender.enabled||!credential.sender.sandbox)outcome=blocked('CREDENTIAL_OR_SCOPE_REJECTED');
  else if(!await deps.repository.authorize(input.businessId,input.preparationId,claim.leaseToken))outcome=blocked('CREDENTIAL_OR_SCOPE_REJECTED');
  else outcome=await sendSandboxReview(claim.event,credential.sender,deps.fetcher);
 }catch{outcome=blocked('CREDENTIAL_REQUIRED');}
 try{await deps.repository.finish(input.preparationId,claim.leaseToken,outcome);}catch{return {status:'uncertain',code:'ACKNOWLEDGEMENT_UNCONFIRMED',postingAuthorized:false};}
 return outcome;
}

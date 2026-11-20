import { z } from "zod";
import { invoiceHandoff } from "./handoff";
import { workspaceSchema } from "../../domain/validation";
const ownedWorkspace=z.object({role:z.literal("owner"),scope:z.literal("owner"),revision:z.number().int().nonnegative(),snapshot:workspaceSchema});
type Dependencies={authenticate:(token:string)=>Promise<boolean>;load:(token:string,businessId:string)=>Promise<unknown>};
const headers={"Cache-Control":"no-store","Vary":"Authorization"};
export async function handleInvoiceHandoff(request: Request, dependencies: Dependencies): Promise<Response> {
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(request.method!=="GET") return reply({error:"method_not_allowed"},405);
 const authorization=request.headers.get("authorization")??"";
 const match=/^Bearer ([^\s]+)$/.exec(authorization);
 if(!match || match[1].length>8192) return reply({error:"authentication_required"},401);
 const businessId=new URL(request.url).searchParams.get("businessId");
 if(!businessId || !z.uuid().safeParse(businessId).success) return reply({error:"invalid_business_id"},400);
 try {
   if(!await dependencies.authenticate(match[1])) return reply({error:"authentication_required"},401);
   const raw=await dependencies.load(match[1],businessId);
   const checked=ownedWorkspace.safeParse(raw);
   if(!checked.success || checked.data.snapshot.business.id!==businessId) return reply({error:"owner_access_required"},403);
   return reply(invoiceHandoff(checked.data.snapshot,"cloud",checked.data.revision));
 } catch { return reply({error:"invoice_snapshot_unavailable"},503); }
}

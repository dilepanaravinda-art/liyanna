import { createClient } from "@supabase/supabase-js";
import { handleInvoiceHandoff } from "../../../../../integrations/finbase/handoff-handler";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url || !key) return Response.json({error:"cloud_not_configured"},{status:503,headers:{"Cache-Control":"no-store"}});
 const clientFor=(token:string)=>createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return handleInvoiceHandoff(request,{
   authenticate:async token=>{const result=await clientFor(token).auth.getUser(token);return !result.error && Boolean(result.data.user);},
   load:async(token,businessId)=>{
     const {data,error}=await clientFor(token).rpc("liyanna_read_workspace",{p_business:businessId});
     if(error) throw Error("Workspace unavailable");
     return data;
   },
 });
}

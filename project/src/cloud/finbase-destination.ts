import {z} from "zod";
import {rpc} from "./client";
export const destinationConfigSchema = z.object({
 companyId:z.string().trim().min(1).max(100), companyLabel:z.string().trim().min(1).max(100),
 currency:z.string().regex(/^[A-Z]{3}$/), revenueCategory:z.string().trim().min(1).max(100),
}).strict();
export type DestinationConfig = z.infer<typeof destinationConfigSchema>;
const response = z.object({
 businessId:z.string().uuid(), revision:z.number().int().nonnegative(),
 status:z.enum(["not_saved","draft","revoked"]), config:destinationConfigSchema.nullable(),
 postingAuthorized:z.literal(false), updatedAt:z.string().nullable(),
});
export type Destination = z.infer<typeof response>;
export async function destinationOperation(businessId:string, action:"read"|"save"|"revoke", expected?:number, config?:DestinationConfig, confirmed=false):Promise<Destination> {
 z.string().uuid().parse(businessId);
 if(action==='save') {destinationConfigSchema.parse(config);if(!confirmed)throw Error('review_confirmation_required');}
 const result=response.parse(await rpc('liyanna_finbase_destination',{
  p_business:businessId,p_action:action,p_expected:expected??null,p_config:config??null,p_confirmed:confirmed,
 }));
 if(result.businessId!==businessId)throw Error('destination_scope_mismatch');
 if((result.status==='not_saved') !== (result.config===null) || (result.status==='not_saved') !== (result.revision===0))throw Error('invalid_destination_response');
 return result;
}
export function destinationError(error:unknown) {
 const message=error instanceof Error?error.message:'';
 if(message.includes('revision_conflict'))return 'These settings changed in another session. Reload before saving again.';
 if(message.includes('owner_required'))return 'Only the cloud workspace owner can manage these settings. Save or sync this workspace to the cloud first.';
 return 'Destination settings are unavailable. Check cloud access and reload. No connection or import has been activated.';
}

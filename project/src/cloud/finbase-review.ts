import {z} from 'zod';
import {rpc} from './client';
import {invoiceIssuedV1} from '../integrations/finbase/contracts';
import {destinationConfigSchema} from './finbase-destination';
const receiptSchema=z.object({id:z.string().uuid(),destinationRevision:z.number().int().positive(),destination:destinationConfigSchema,event:invoiceIssuedV1,preparedAt:z.string()});
export type ReviewReceipt=z.infer<typeof receiptSchema>;
function scoped(businessId:string,receipt:ReviewReceipt){
 if(receipt.event.businessId!==businessId||receipt.event.tenantId!==businessId||receipt.id!==receipt.event.eventId)throw Error('review_scope_mismatch');
 return receipt;
}
export async function readReviewReceipts(businessId:string){
 const result=z.object({businessId:z.literal(businessId),postingAuthorized:z.literal(false),receipts:z.array(receiptSchema).max(30)}).parse(await rpc('liyanna_finbase_review',{p_business:businessId,p_action:'read'}));
 return result.receipts.map(receipt=>scoped(businessId,receipt));
}
export async function prepareReviewEvent(input:{businessId:string;documentId:string;documentRevision:number;destinationRevision:number;customerId:string;confirmed:boolean}){
 z.string().uuid().parse(input.businessId);z.string().uuid().parse(input.documentId);z.string().uuid().parse(input.customerId);
 if(!input.confirmed)throw Error('review_confirmation_required');
 const result=z.object({businessId:z.literal(input.businessId),postingAuthorized:z.literal(false),duplicate:z.boolean(),receipt:receiptSchema}).parse(await rpc('liyanna_finbase_review',{
  p_business:input.businessId,p_action:'prepare',p_document:input.documentId,p_document_revision:input.documentRevision,p_destination_revision:input.destinationRevision,p_customer:input.customerId,p_confirmed:true,
 }));
 return {...result,receipt:scoped(input.businessId,result.receipt)};
}
export function reviewPreparationError(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(message.includes('review_preparation_conflict'))return 'This invoice revision already has a different review preparation. Keep its original event for retries; review source or destination changes before preparing a new invoice revision.';
 if(message.includes('revision_conflict'))return 'The cloud invoice or destination changed. Sync this workspace and reload review events before trying again.';
 if(message.includes('matching_cloud_customer_required'))return 'Choose a synced customer whose name, email and phone match the invoice.';
 if(message.includes('review_destination_required'))return 'Save an active review destination, then reload review events.';
 if(message.includes('review_currency_required'))return 'The invoice must match the destination currency. Event preparation currently supports LKR, USD, EUR, GBP, AUD, CAD, NZD, SGD, INR, CNY, AED and SAR.';
 if(message.includes('owner_required'))return 'Only the cloud business owner can prepare review events. Sync this workspace to the cloud first.';
 return 'Unable to prepare cloud review events. Check cloud access and source data, then reload. No delivery or financial posting has occurred.';
}

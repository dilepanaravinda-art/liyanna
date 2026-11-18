import { describe, it, expect, vi } from 'vitest';
import { processDeliveryBatch, type ClaimedEvent, type DeliveryRepository } from './delivery-worker';
const event: ClaimedEvent = { id:'evt', connectionId:'conn', tenantId:'tenant', businessId:'business', destination:'finbase', eventType:'invoice.issued', envelope:{eventId:'stable-id'}, leaseOwner:'worker-123', attempts:1 };
function repo(allowed=true): DeliveryRepository {
  return { claim: vi.fn().mockResolvedValue([event]), authorize: vi.fn().mockResolvedValue({allowed}), markDelivered:vi.fn().mockResolvedValue(true), markRetry:vi.fn().mockResolvedValue(true) };
}
describe('delivery worker', () => {
  it('delivers permitted events', async () => { const r=repo(); const send=vi.fn(); const outcome=await processDeliveryBatch(r,{deliver:send},'worker-123'); expect(outcome.delivered).toBe(1); expect(send).toHaveBeenCalledOnce(); });
  it('does not send revoked connections', async () => { const r=repo(false); const send=vi.fn(); const outcome=await processDeliveryBatch(r,{deliver:send},'worker-123'); expect(outcome.deadLettered).toBe(1); expect(send).not.toHaveBeenCalled(); });
  it('retries transient delivery failures', async () => { const r=repo(); const outcome=await processDeliveryBatch(r,{deliver:async()=>{throw new Error('network');}},'worker-123'); expect(outcome.retried).toBe(1); expect(r.markRetry).toHaveBeenCalledWith(event,'network',expect.any(Date)); });
  it('rejects invalid worker IDs and batch sizes', async () => { await expect(processDeliveryBatch(repo(),{deliver:async()=>{}},'bad')).rejects.toThrow(); await expect(processDeliveryBatch(repo(),{deliver:async()=>{}},'worker-123',101)).rejects.toThrow(); });
});

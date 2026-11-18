import { describe, expect, it } from 'vitest';
import { canClaim, requireFreshLease, validateEnqueue } from './queue-policy';
const id = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const sample = {
  connectionId: id, tenantId: id, businessId: id, destination: 'finbase',
  event: { schemaVersion: '1.0', eventId: id, correlationId: id,
    idempotencyKey: 'unique-event-key-1234', providerId: 'liyanna',
    eventType: 'liyanna.invoice.issued', tenantId: id, businessId: id,
    occurredAt: '2026-11-18T12:00:00Z', sourceId: 'invoice-1', payload: {} },
};
describe('VIG durable queue policy', () => {
  it('accepts valid scoped event', () => expect(validateEnqueue(sample).destination).toBe('finbase'));
  it('rejects cross-tenant event', () => expect(() => validateEnqueue({...sample,tenantId:other})).toThrow());
  it('rejects sending back to source', () => expect(() => validateEnqueue({...sample,destination:'liyanna'})).toThrow());
  it('claims due pending, not future pending', () => {
    const now = new Date('2026-11-18T12:00:00Z');
    expect(canClaim('pending',now,null,now)).toBe(true);
    expect(canClaim('pending',new Date(now.getTime()+1000),null,now)).toBe(false);
  });
  it('recovers expired leases but not live leases', () => {
    const now = new Date('2026-11-18T12:00:00Z');
    expect(canClaim('processing',now,new Date(now.getTime()-1),now)).toBe(true);
    expect(canClaim('processing',now,new Date(now.getTime()+1000),now)).toBe(false);
    expect(canClaim('delivered',now,null,now)).toBe(false);
  });
  it('rejects wrong lease owner', () => expect(() => requireFreshLease(id,other,new Date('2099-01-01'),new Date())).toThrow());
});

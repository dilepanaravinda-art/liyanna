/** Pure policy helpers for a future database-backed event worker. */
import { z } from 'zod';
import { integrationEventSchema } from './event-envelope';

export const queueRecordSchema = z.object({
  connectionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  businessId: z.string().uuid(),
  destination: z.string().min(1).max(128),
  event: integrationEventSchema,
}).strict();

export function validateEnqueue(raw: unknown) {
  const record = queueRecordSchema.parse(raw);
  if (record.tenantId !== record.event.tenantId || record.businessId !== record.event.businessId) {
    throw new Error('Event scope does not match connection scope');
  }
  if (record.destination === record.event.providerId) {
    throw new Error('Source provider cannot be its own destination');
  }
  return record;
}

export type QueueState = 'pending' | 'processing' | 'delivered' | 'dead_letter';
export function canClaim(state: QueueState, nextAttemptAt: Date, leaseUntil: Date | null, now: Date): boolean {
  if (state === 'pending') return nextAttemptAt.getTime() <= now.getTime();
  if (state === 'processing') return leaseUntil !== null && leaseUntil.getTime() < now.getTime();
  return false;
}

/** Delivery is at-least-once. Receivers MUST enforce idempotency keys. */
export function requireFreshLease(leaseOwner: string | null, expectedOwner: string, leaseUntil: Date | null, now: Date) {
  if (!leaseOwner || leaseOwner !== expectedOwner || !leaseUntil || leaseUntil.getTime() <= now.getTime()) {
    throw new Error('Worker does not own an active lease');
  }
}

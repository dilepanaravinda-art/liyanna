/** Provider-neutral, transport-independent event contract. No AI CEO dependency. */
import { z } from 'zod';

export const integrationEventSchema = z.object({
  schemaVersion: z.literal('1.0'),
  eventId: z.string().uuid(),
  correlationId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
  providerId: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  eventType: z.string().regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/),
  tenantId: z.string().min(1).max(128),
  businessId: z.string().min(1).max(128),
  occurredAt: z.string().datetime({ offset: true }),
  sourceId: z.string().min(1).max(256),
  payload: z.record(z.string(), z.unknown()),
}).strict();
export type IntegrationEvent = z.infer<typeof integrationEventSchema>;

export interface DeliveryStore {
  /** Atomically claim eventId + destination and deduplicate across concurrent workers. */
  claim(eventId: string, destination: string): Promise<'claimed' | 'already-delivered' | 'busy'>;
  /** Persist success before acknowledging upstream; failed attempts remain retryable. */
  delivered(eventId: string, destination: string): Promise<void>;
  failed(eventId: string, destination: string, reason: string, retryAt: string | null): Promise<void>;
}
export type EventTransport = (destination: string, event: IntegrationEvent) => Promise<void>;

export function retryDelayMs(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid attempt');
  if (attempt > 8) return null; // dead-letter / manual investigation
  return Math.min(60_000 * 2 ** (attempt - 1), 3_600_000);
}

/** Caller must verify connection scope, capability, consent, and credentials server-side. */
export async function deliverEvent(input: {
  rawEvent: unknown; destination: string; attempt: number; store: DeliveryStore;
  transport: EventTransport; authorize: (event: IntegrationEvent, destination: string) => Promise<void>;
  now?: Date;
}): Promise<'delivered' | 'duplicate' | 'busy' | 'retry' | 'dead-letter'> {
  const event = integrationEventSchema.parse(input.rawEvent);
  if (!input.destination || input.destination.length > 128) throw new Error('Invalid destination');
  await input.authorize(event, input.destination); // re-check permission even on retries
  const claim = await input.store.claim(event.eventId, input.destination);
  if (claim === 'already-delivered') return 'duplicate';
  if (claim === 'busy') return 'busy';
  try {
    await input.transport(input.destination, event);
    await input.store.delivered(event.eventId, input.destination);
    return 'delivered';
  } catch (error) {
    const delay = retryDelayMs(input.attempt);
    const retryAt = delay === null ? null : new Date((input.now ?? new Date()).getTime() + delay).toISOString();
    await input.store.failed(event.eventId, input.destination, error instanceof Error ? error.message.slice(0, 240) : 'Delivery failed', retryAt);
    return delay === null ? 'dead-letter' : 'retry';
  }
}

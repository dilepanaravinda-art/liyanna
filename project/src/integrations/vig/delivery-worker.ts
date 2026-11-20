/** VIG transport-neutral worker. Server-only: never import into client components. */
export type ClaimedEvent = {
  id: string; connectionId: string; tenantId: string; businessId: string;
  destination: string; eventType: string; envelope: Record<string, unknown>;
  leaseOwner: string; attempts: number;
};
export type DeliveryPermission = { allowed: boolean; reason?: string };
export interface DeliveryRepository {
  claim(workerId: string, limit: number): Promise<ClaimedEvent[]>;
  authorize(event: ClaimedEvent): Promise<DeliveryPermission>;
  markDelivered(event: ClaimedEvent): Promise<boolean>;
  markRetry(event: ClaimedEvent, message: string, retryAt: Date | null): Promise<boolean>;
}
export interface ProviderTransport {
  deliver(event: ClaimedEvent): Promise<void>;
}
export type WorkerOutcome = { claimed: number; delivered: number; retried: number; deadLettered: number; lostLease: number };

/** At-least-once delivery; receiver MUST deduplicate on envelope event ID. */
export async function processDeliveryBatch(
  repo: DeliveryRepository,
  transport: ProviderTransport,
  workerId: string,
  limit = 10,
  now = () => new Date(),
): Promise<WorkerOutcome> {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(workerId)) throw new Error('Invalid worker ID');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid batch limit');
  const events = await repo.claim(workerId, limit);
  const result: WorkerOutcome = { claimed: events.length, delivered: 0, retried: 0, deadLettered: 0, lostLease: 0 };
  for (const event of events) {
    if (event.leaseOwner !== workerId) { result.lostLease++; continue; }
    try {
      const permission = await repo.authorize(event); // Re-check at delivery time, not only enqueue time.
      if (!permission.allowed) {
        if (await repo.markRetry(event, `Authorization denied: ${permission.reason ?? 'revoked'}`, null)) result.deadLettered++;
        else result.lostLease++;
        continue;
      }
      await transport.deliver(event);
      if (await repo.markDelivered(event)) result.delivered++;
      else result.lostLease++;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Delivery failed';
      const terminal = event.attempts >= 8;
      const exponentialSeconds = Math.min(3600, 30 * 2 ** Math.min(event.attempts, 7));
      const retryAt = terminal ? null : new Date(now().getTime() + exponentialSeconds * 1000);
      if (await repo.markRetry(event, message, retryAt)) {
        if (terminal) result.deadLettered++;
        else result.retried++;
      } else result.lostLease++;
    }
  }
  return result;
}

/** Production Node.js entrypoint for the transport-neutral delivery algorithm.
 * All effects are injected. An unsuccessful acknowledgement is treated as a lost lease.
 */
export async function processDeliveryBatch(repo, transport, workerId, limit = 10, now = () => new Date()) {
  if (typeof workerId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(workerId)) throw new Error('Invalid worker ID');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid batch limit');
  for (const name of ['claim', 'authorize', 'markDelivered', 'markRetry']) {
    if (typeof repo?.[name] !== 'function') throw new Error(`Repository missing ${name}`);
  }
  if (typeof transport?.deliver !== 'function') throw new Error('Delivery transport required');
  const events = await repo.claim(workerId, limit);
  if (!Array.isArray(events) || events.length > limit) throw new Error('Invalid claimed event batch');
  // Reject malformed or duplicate claims before performing any external delivery.
  // The database should enforce uniqueness; this protects against repository regressions.
  const ids = new Set();
  for (const event of events) {
    if (!event || typeof event.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(event.id) || ids.has(event.id)) {
      throw new Error('Invalid or duplicate claimed event');
    }
    ids.add(event.id);
  }
  const result = {claimed: events.length, delivered: 0, retried: 0, deadLettered: 0, lostLease: 0};
  for (const event of events) {
    if (event.leaseOwner !== workerId) { result.lostLease++; continue; }
    try {
      const permission = await repo.authorize(event);
      if (!permission?.allowed) {
        if (await repo.markRetry(event, 'Authorization denied', null)) result.deadLettered++;
        else result.lostLease++;
        continue;
      }
      await transport.deliver(event);
      if (await repo.markDelivered(event)) result.delivered++;
      else result.lostLease++;
    } catch (error) {
      // Provider exceptions can contain authorization headers, URLs or response bodies.
      // Persist only a fixed error category; never store exception text in the outbox.
      const message = 'Delivery failed';
      const terminal = event.attempts >= 8;
      const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(event.attempts, 7));
      const retryAt = terminal ? null : new Date(now().getTime() + delaySeconds * 1000);
      if (await repo.markRetry(event, message, retryAt)) {
        if (terminal) result.deadLettered++;
        else result.retried++;
      } else result.lostLease++;
    }
  }
  return result;
}

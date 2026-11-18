/** Bridge from the VIG worker's ClaimedEvent to the HTTP transport contract.
 * Pure adapter: database access and credential retrieval remain server-side responsibilities.
 */
export function adaptClaimedEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('Claimed event required');
  const { connectionId, tenantId, businessId, eventType, envelope } = event;
  for (const [name, value] of Object.entries({connectionId, tenantId, businessId, eventType})) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${name}`);
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Invalid event envelope');
  const eventId = envelope.eventId ?? envelope.id;
  if (typeof eventId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(eventId)) throw new Error('Invalid event ID');
  if (envelope.tenantId !== undefined && envelope.tenantId !== tenantId) throw new Error('Envelope tenant mismatch');
  if (envelope.businessId !== undefined && envelope.businessId !== businessId) throw new Error('Envelope business mismatch');
  if (envelope.eventType !== undefined && envelope.eventType !== eventType) throw new Error('Envelope event type mismatch');
  return {connectionId, tenantId, businessId, eventType, envelope: {...envelope, id:eventId}};
}

export function createWorkerTransport(secureTransport) {
  if (!secureTransport || typeof secureTransport.deliver !== 'function') throw new Error('Secure transport required');
  return { deliver: (claimedEvent) => secureTransport.deliver(adaptClaimedEvent(claimedEvent)) };
}

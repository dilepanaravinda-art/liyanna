import { validateProviderEndpoint } from './endpoint-policy.mjs';
import { assertPublicDns } from './dns-policy.mjs';
/** Server-only HTTP delivery adapter. Never import from a client component. */
export function createSecureTransport({ resolveConnection, fetchImpl = fetch, timeoutMs = 10000, dnsResolver }) {
  if (typeof resolveConnection !== 'function') throw new Error('Connection resolver required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) throw new Error('Invalid timeout');
  return {
    async deliver(event) {
      const connection = await resolveConnection(event.connectionId, event);
      if (!connection || connection.status !== 'active' || connection.tenantId !== event.tenantId || connection.businessId !== event.businessId) {
        throw new Error('Connection inactive or scope mismatch');
      }
      let url;
      try { url = validateProviderEndpoint(connection.endpoint); } catch { throw new Error('Endpoint not authorized'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || !connection.allowedOrigins?.includes(url.origin)) {
        throw new Error('Endpoint not authorized');
      }
      await assertPublicDns(url.hostname, dnsResolver);
      if (!connection.token || typeof connection.token !== 'string') throw new Error('Missing server-side credential');
      const eventId = event.envelope?.id;
      if (typeof eventId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(eventId)) throw new Error('Invalid event ID');
      const response = await fetchImpl(url.toString(), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${connection.token}`, 'idempotency-key': eventId, 'x-vig-event-type': event.eventType },
        body: JSON.stringify(event.envelope),
      });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
    },
  };
}

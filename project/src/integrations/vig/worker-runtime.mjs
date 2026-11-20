/** Server-only worker runtime wiring. All infrastructure is injected; never import in a client component. */
import { createWorkerTransport } from './worker-transport-adapter.mjs';
import { createSecureTransport } from './secure-transport.mjs';

/** Prevent accidentally running with mock or unconfigured credentials. */
export function validateWorkerConfiguration(config) {
  if (!config || typeof config !== 'object') throw new Error('Worker configuration required');
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(config.workerId ?? '')) throw new Error('Worker ID must be a UUID');
  if (!Number.isInteger(config.batchLimit) || config.batchLimit < 1 || config.batchLimit > 100) throw new Error('Batch limit must be 1–100');
  if (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.length === 0) throw new Error('Explicit destination allowlist required');
  for (const origin of config.allowedOrigins) {
    const u = new URL(origin);
    if (u.protocol !== 'https:' || u.origin !== origin || u.username || u.password) throw new Error('Allowed origins must be canonical HTTPS origins');
  }
  return Object.freeze({ workerId: config.workerId, batchLimit: config.batchLimit, allowedOrigins: [...config.allowedOrigins] });
}

/**
 * Fail-closed execution boundary: repository, delivery processor, and secrets are injected.
 * No database connection or secret is created inside this module.
 */
export async function runWorkerOnce({ config, repository, processBatch, fetchImpl, resolveConnection, dnsResolver }) {
  const settings = validateWorkerConfiguration(config);
  if (!repository || typeof repository.claim !== 'function' || typeof repository.authorize !== 'function' ||
      typeof repository.markDelivered !== 'function' || typeof repository.markRetry !== 'function') throw new Error('Persistent repository required');
  if (typeof processBatch !== 'function') throw new Error('Delivery processor required');
  if (typeof resolveConnection !== 'function') throw new Error('Server-side connection resolver required');
  if (typeof fetchImpl !== 'function') throw new Error('Fetch transport required');
  const secure = createSecureTransport({
    fetchImpl,
    dnsResolver,
    resolveConnection: async (id, currentEvent) => {
      const connection = await resolveConnection(id, { tenantId: currentEvent.tenantId, businessId: currentEvent.businessId });
      if (!connection) return null;
      // Enforce a centrally configured allowlist, never just provider-supplied origins.
      return { ...connection, allowedOrigins: (connection.allowedOrigins ?? []).filter(origin => settings.allowedOrigins.includes(origin)) };
    },
  });
  const transport = createWorkerTransport(secure);
  return processBatch(repository, transport, settings.workerId, settings.batchLimit);
}

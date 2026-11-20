import { isActiveDeliveryConnection } from './connection-validity.mjs';
/** Server-only composition root. Supply a least-privilege PostgreSQL client and a secret vault resolver.
 * This module never reads credentials from the browser or logs secret values.
 */
import { createPostgresDeliveryRepository } from './postgres-repository.mjs';
import { runWorkerOnce } from './worker-runtime.mjs';
import { processDeliveryBatch } from './delivery-processor.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createWorkerService({ db, secretResolver, processBatch, fetchImpl, config, dnsResolver }) {
  if (!db || typeof db.query !== 'function') throw new Error('Dedicated database client required');
  if (typeof secretResolver !== 'function') throw new Error('Server-side secret resolver required');
  if (processBatch !== undefined && typeof processBatch !== 'function') throw new Error('Batch processor must be a function');
  if (typeof fetchImpl !== 'function') throw new Error('Fetch implementation required');
  if (!config?.providerEndpoints || typeof config.providerEndpoints !== 'object') throw new Error('Approved provider endpoints required');
  for (const endpoint of Object.values(config.providerEndpoints)) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !config.allowedOrigins?.includes(url.origin)) throw new Error('Provider endpoint not allowlisted');
  }
  const repository = createPostgresDeliveryRepository({ db });
  const resolveConnection = async (connectionId, scope) => {
    if (typeof connectionId !== 'string' || !UUID.test(connectionId)) throw new Error('Invalid connection ID');
    const { rows } = await db.query(`SELECT c.id, c.tenant_id, c.business_id, c.status, c.provider_id, c.credential_reference,
        c.consented_at, c.expires_at, c.revoked_at, g.enabled AS delivery_enabled, g.requires_approval
      FROM liyanna_integrations.connections c
      LEFT JOIN liyanna_integrations.grants g ON g.connection_id=c.id AND g.capability='events:deliver'
      WHERE c.id=$1::uuid LIMIT 1`, [connectionId]);
    const row = rows[0];
    if (!isActiveDeliveryConnection(row, row?.delivery_enabled)) return null;
    // Validate the event scope BEFORE consulting the secret vault.
    if (!scope || row.tenant_id !== scope.tenantId || row.business_id !== scope.businessId) return null;
    const endpoint = config.providerEndpoints[row.provider_id];
    if (typeof endpoint !== 'string') return null;
    // No secret reference means no outbound delivery. Do not accept plaintext secrets from DB rows.
    if (typeof row.credential_reference !== 'string' || !row.credential_reference.trim()) return null;
    const token = await secretResolver(row.credential_reference, { tenantId: row.tenant_id, businessId: row.business_id, connectionId });
    if (typeof token !== 'string' || !token.trim()) return null;
    return { status: row.status, tenantId: row.tenant_id, businessId: row.business_id,
      endpoint, token, allowedOrigins: config.allowedOrigins };
  };
  return Object.freeze({ runOnce: () => runWorkerOnce({ config, repository, processBatch: processBatch ?? processDeliveryBatch, fetchImpl, resolveConnection, dnsResolver }) });
}

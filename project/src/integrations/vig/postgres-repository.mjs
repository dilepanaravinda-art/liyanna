import { isActiveDeliveryConnection } from './connection-validity.mjs';
/** Server-only PostgreSQL adapter. Inject a dedicated least-privilege pg Pool/Client. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(value, label) { if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`Invalid ${label}`); return value; }
function mapRow(row) {
  const envelope = row.envelope;
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('Invalid event envelope');
  return { id: row.id, connectionId: row.connection_id, tenantId: row.tenant_id, businessId: row.business_id,
    destination: row.destination, eventType: row.event_type, envelope, leaseOwner: row.lease_owner, attempts: row.attempts };
}
export function createPostgresDeliveryRepository({ db }) {
  if (!db || typeof db.query !== 'function') throw new Error('Database query interface required');
  return {
    async claim(workerId, limit) {
      uuid(workerId, 'worker ID');
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid batch limit');
      const { rows } = await db.query('SELECT * FROM liyanna_integrations.claim_events($1::uuid,$2::integer)', [workerId, limit]);
      return rows.map(mapRow);
    },
    async authorize(event) {
      uuid(event.connectionId, 'connection ID'); uuid(event.tenantId, 'tenant ID'); uuid(event.businessId, 'business ID');
      const { rows } = await db.query(`SELECT c.status, c.consented_at, c.expires_at, c.revoked_at,
        g.enabled, g.requires_approval
        FROM liyanna_integrations.connections c
        LEFT JOIN liyanna_integrations.grants g ON g.connection_id=c.id AND g.capability=$4
        WHERE c.id=$1::uuid AND c.tenant_id=$2::uuid AND c.business_id=$3::uuid`,
        [event.connectionId, event.tenantId, event.businessId, 'events:deliver']);
      const c = rows[0];
      if (!isActiveDeliveryConnection(c, c?.enabled)) {
        return { allowed: false, reason: 'Connection or delivery permission unavailable' };
      }
      return { allowed: true };
    },
    async markDelivered(event) {
      uuid(event.id, 'event ID'); uuid(event.leaseOwner, 'lease owner');
      const { rows } = await db.query('SELECT liyanna_integrations.finish_event($1::uuid,$2::uuid,true,NULL,NULL) AS updated', [event.id, event.leaseOwner]);
      return rows[0]?.updated === true;
    },
    async markRetry(event, message, retryAt) {
      uuid(event.id, 'event ID'); uuid(event.leaseOwner, 'lease owner');
      if (retryAt !== null && (!(retryAt instanceof Date) || !Number.isFinite(retryAt.getTime()))) throw new Error('Invalid retry date');
      const { rows } = await db.query('SELECT liyanna_integrations.finish_event($1::uuid,$2::uuid,false,$3::text,$4::timestamptz) AS updated',
        [event.id, event.leaseOwner, String(message).slice(0, 300), retryAt?.toISOString() ?? null]);
      return rows[0]?.updated === true;
    },
  };
}

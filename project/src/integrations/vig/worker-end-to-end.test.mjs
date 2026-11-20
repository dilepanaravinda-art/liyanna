import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerService } from './worker-service.mjs';

const workerId = '123e4567-e89b-12d3-a456-426614174000';
const eventId = '123e4567-e89b-12d3-a456-426614174001';
const connectionId = '123e4567-e89b-12d3-a456-426614174002';
const tenantId = '123e4567-e89b-12d3-a456-426614174003';
const businessId = '123e4567-e89b-12d3-a456-426614174004';
const config = { workerId, batchLimit: 5, allowedOrigins: ['https://finbase.example.com'], providerEndpoints: { finbase: 'https://finbase.example.com/v1/events' } };

function fixture({ revoked = false, failHttp = false, grant = true } = {}) {
  const sqlCalls = [], httpCalls = [], vaultCalls = [];
  let state = 'pending';
  let attempts = 0;
  const db = { async query(sql, params = []) {
    sqlCalls.push({ sql, params });
    if (sql.includes('claim_events(')) {
      if (state !== 'pending') return { rows: [] };
      state = 'leased'; attempts++;
      return { rows: [{ id: eventId, connection_id: connectionId, tenant_id: tenantId, business_id: businessId, lease_owner: workerId, attempts, destination: 'finbase', event_type: 'invoice.issued', envelope: { id: 'invoice_event_001', tenantId, businessId, eventType: 'invoice.issued', invoiceId: 'INV-1001' } }] };
    }
    if (sql.includes('finish_event(')) {
      assert.equal(params[0], eventId);
      assert.equal(params[1], workerId);
      state = sql.includes(',true,') ? 'delivered' : (params[3] ? 'pending' : 'dead_letter');
      return { rows: [{ updated: true }] };
    }
    if (sql.includes('FROM liyanna_integrations.connections')) {
      if (sql.includes('g.capability=$4')) assert.equal(params[3], 'events:deliver');
      return { rows: [{ id: connectionId, tenant_id: tenantId, business_id: businessId, status: 'active', provider_id: 'finbase', credential_reference: 'vault/finbase/test', consented_at: '2026-01-01T00:00:00Z', revoked_at: revoked ? '2026-02-01T00:00:00Z' : null, enabled: grant, delivery_enabled: grant, requires_approval: false }] };
    }
    throw Error('Unexpected query');
  } };
  const service = createWorkerService({ db, config,
    secretResolver: async (ref, scope) => { vaultCalls.push({ ref, scope }); return 'test-secret'; },
    dnsResolver: async () => [{ address: '8.8.8.8' }],
    fetchImpl: async (url, options) => { httpCalls.push({ url, options }); return { ok: !failHttp, status: failHttp ? 503 : 202 }; },
  });
  return { service, sqlCalls, httpCalls, vaultCalls, getState: () => state };
}

test('full worker pipeline claims, authorizes, resolves vault, delivers and acknowledges invoice event', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.runOnce(), { claimed: 1, delivered: 1, retried: 0, deadLettered: 0, lostLease: 0 });
  assert.equal(f.getState(), 'delivered');
  assert.equal(f.vaultCalls.length, 1);
  assert.deepEqual(f.vaultCalls[0].scope, { tenantId, businessId, connectionId });
  assert.equal(f.httpCalls.length, 1);
  assert.equal(f.httpCalls[0].url, 'https://finbase.example.com/v1/events');
  assert.equal(f.httpCalls[0].options.headers['idempotency-key'], 'invoice_event_001');
  assert.equal(f.httpCalls[0].options.headers.authorization, 'Bearer test-secret');
  assert.equal(JSON.parse(f.httpCalls[0].options.body).invoiceId, 'INV-1001');
  assert.equal((await f.service.runOnce()).claimed, 0);
  assert.equal(f.httpCalls.length, 1);
});

test('revoked consent prevents vault lookup and outbound request', async () => {
  const f = fixture({ revoked: true });
  const result = await f.service.runOnce();
  assert.equal(result.delivered, 0);
  assert.equal(f.vaultCalls.length, 0);
  assert.equal(f.httpCalls.length, 0);
  assert.equal(f.getState(), 'dead_letter');
});

test('provider HTTP error is retried without storing sensitive provider response', async () => {
  const f = fixture({ failHttp: true });
  const result = await f.service.runOnce();
  assert.equal(result.retried, 1);
  assert.equal(f.getState(), 'pending');
  const finish = f.sqlCalls.find(c => c.sql.includes('finish_event('));
  assert.equal(finish.params[2], 'Delivery failed');
  assert.ok(finish.params[3]);
  assert.equal(f.vaultCalls.length, 1);
});

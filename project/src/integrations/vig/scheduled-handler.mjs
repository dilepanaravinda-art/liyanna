/** Authenticated scheduled worker HTTP boundary. Server-only. */
import { timingSafeEqual } from 'node:crypto';

function matchesBearer(header, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof header !== 'string') return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(header);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Creates a fetch-style handler; no infrastructure is initialized until an authenticated request. */
export function createScheduledWorkerHandler({ secret, runOnce, enabled = false }) {
  if (typeof runOnce !== 'function') throw new Error('Worker execution callback required');
  // Prevent overlapping invocations within this server process. Database leases remain
  // authoritative across replicas, cold starts, and other worker instances.
  let running = false;
  return async function handle(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (!matchesBearer(request.headers.get('authorization'), secret)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!enabled) return Response.json({ error: 'Worker not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    if (running) return Response.json({ error: 'Worker already running' }, { status: 409, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
    running = true;
    try {
      const result = await runOnce();
      return Response.json({ ok: true, result: result ?? null }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      // Never expose database errors, connection details, or credentials to callers.
      return Response.json({ error: 'Worker execution failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    } finally {
      running = false;
    }
  };
}

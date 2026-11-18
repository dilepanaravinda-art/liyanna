import { validateProviderEndpoint } from './endpoint-policy.mjs';
/** Strict staging configuration parser; never logs or returns secrets. */
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function parseWorkerConfig(env) {
  if (env.LIYANNA_WORKER_ENABLED !== 'true') return { enabled: false };
  if (env.NODE_ENV === 'production' && env.LIYANNA_WORKER_PRODUCTION_APPROVED !== 'true') {
    throw new Error('Production worker requires explicit approval');
  }
  const secret = env.LIYANNA_WORKER_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Worker secret must be at least 32 characters');
  if (!UUID.test(env.LIYANNA_WORKER_ID ?? '')) throw new Error('Worker ID must be a UUID');
  const batchLimit = Number(env.LIYANNA_WORKER_BATCH_LIMIT ?? 10);
  if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 100) throw new Error('Invalid worker batch limit');
  let providerEndpoints;
  try { providerEndpoints = JSON.parse(env.LIYANNA_PROVIDER_ENDPOINTS ?? '{}'); }
  catch { throw new Error('Invalid provider endpoint configuration'); }
  if (!providerEndpoints || Array.isArray(providerEndpoints) || typeof providerEndpoints !== 'object' || !Object.keys(providerEndpoints).length) {
    throw new Error('At least one approved provider endpoint is required');
  }
  const allowedOrigins = [];
  for (const [provider, endpoint] of Object.entries(providerEndpoints)) {
    if (!/^[a-z][a-z0-9_-]{1,63}$/i.test(provider) || typeof endpoint !== 'string') throw new Error('Invalid provider endpoint');
    const url = validateProviderEndpoint(endpoint);
    allowedOrigins.push(url.origin);
  }
  return { enabled: true, secret, config: { workerId: env.LIYANNA_WORKER_ID, batchLimit, providerEndpoints, allowedOrigins: [...new Set(allowedOrigins)] } };
}

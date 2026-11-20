import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** DNS preflight is defense in depth, not a replacement for network egress controls.
 * Fetch may resolve the hostname again after this check (DNS rebinding / TOCTOU).
 */
export function isPublicAddress(address) {
  if (typeof address !== 'string' || !isIP(address)) return false;
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    // Conservative policy: reject IPv6 until a trusted egress proxy can pin addresses.
    return false;
  }
  const octets = address.split('.').map(Number);
  const [a,b,c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 ||
      a === 100 && b >= 64 && b <= 127 || a === 192 && b === 0 && c === 0 ||
      a === 192 && b === 0 && c === 2 || a === 198 && (b === 18 || b === 19) ||
      a === 198 && b === 51 && c === 100 || a === 203 && b === 0 && c === 113 ||
      a === 192 && b === 88 && c === 99) return false;
  return true;
}

export async function assertPublicDns(hostname, resolver = lookup) {
  let records;
  try { records = await resolver(hostname, { all: true, verbatim: true }); }
  catch { throw new Error('Provider DNS validation failed'); }
  if (!Array.isArray(records) || !records.length || records.some(record => !isPublicAddress(record?.address))) {
    throw new Error('Provider DNS address not authorized');
  }
}

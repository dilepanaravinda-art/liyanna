/** Defense-in-depth URL policy. Network egress must also restrict DNS-resolved IPs. */
export function validateProviderEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Provider endpoint is not allowed'); }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const forbidden = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.invalid') ||
    host === 'metadata.google.internal' || host === '[::1]' || host.startsWith('[fc') ||
    host.startsWith('[fd') || host.startsWith('[fe8') || host.startsWith('[fe9') ||
    host.startsWith('[fea') || host.startsWith('[feb') || host.startsWith('[::ffff:') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[') ||
    !host.includes('.') || host.endsWith('.example');
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || forbidden ||
      (url.port && url.port !== '443')) throw new Error('Provider endpoint is not allowed');
  return url;
}

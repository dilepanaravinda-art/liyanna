/** Non-destructive verification of a deployed LIYANNA preview. */
const input = process.env.LIYANNA_PREVIEW_URL;
if (!input) { console.error('Set LIYANNA_PREVIEW_URL to the preview URL.'); process.exit(2); }
let origin;
try {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid preview URL');
  origin = url.origin;
} catch { console.error('LIYANNA_PREVIEW_URL must be a clean HTTPS origin.'); process.exit(2); }
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
async function check(path, expected, verify) {
  const response = await fetch(origin + path, { headers, redirect: 'manual', signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  if (verify) await verify(response);
  console.log(`PASS ${path}: ${response.status}`);
}
try {
  await check('/api/health', 200, async response => {
    const body = await response.json();
    if (body.status !== 'ok' || body.service !== 'liyanna') throw new Error('Unexpected LIYANNA health payload');
  });
  await check('/api/ready', 200, async response => {
    const body = await response.json();
    if (body.status !== 'ready' || body.service !== 'liyanna') throw new Error('Supabase public configuration is missing');
  });
  await check('/', 200, async response => {
    const html = await response.text();
    if (!html.includes('<html')) throw new Error('Homepage did not return HTML');
  });
  console.log('Deployment smoke verification passed.');
} catch (error) { console.error('Deployment smoke verification failed:', error.message); process.exitCode = 1; }

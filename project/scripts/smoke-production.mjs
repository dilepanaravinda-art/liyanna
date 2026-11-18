/** Boots the built Next.js application and verifies public and protected routes. */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 31000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const nextBin = resolve(root, 'node_modules/next/dist/bin/next');
const server = spawn(process.execPath, [nextBin, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', data => { logs = (logs + data.toString()).slice(-12000); });
async function request(path, options) {
  return fetch(base + path, { ...options, signal: AbortSignal.timeout(2500), redirect: 'manual' });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited with code ${server.exitCode}`);
    try { const response = await request('/api/health'); if (response.ok) { ready = true; break; } } catch {}
    await sleep(500);
  }
  if (!ready) throw new Error('Application did not become ready in 20 seconds');
  const health = await request('/api/health');
  const body = await health.json();
  if (health.status !== 200 || body.status !== 'ok' || body.service !== 'liyanna') throw new Error('Health endpoint failed');
  if (health.headers.get('cache-control') !== 'no-store') throw new Error('Health response is cacheable');
  const home = await request('/');
  if (home.status !== 200) throw new Error(`Homepage returned ${home.status}`);
  const worker = await request('/api/integrations/worker', { method: 'POST' });
  if (worker.status !== 401) throw new Error(`Unauthenticated worker returned ${worker.status}, expected 401`);
  console.log('Production smoke PASS: health, homepage, worker authentication');
} catch (error) {
  console.error(`Production smoke FAIL: ${error.message}\n${logs}`);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(3000)]);
  if (server.exitCode === null) server.kill('SIGKILL');
}

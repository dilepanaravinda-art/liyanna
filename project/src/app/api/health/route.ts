/** Minimal unauthenticated liveness check. Never exposes environment or tenant data. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'ok', service: 'liyanna' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

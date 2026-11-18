/** Readiness is configuration-only: no DB call, credential disclosure, or tenant access. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return Response.json(
    { status: configured ? 'ready' : 'not_ready', service: 'liyanna' },
    {
      status: configured ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

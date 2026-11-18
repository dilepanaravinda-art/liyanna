import { createScheduledWorkerHandler } from '../../../../integrations/vig/scheduled-handler.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fail closed until a dedicated database client and secret resolver are wired in staging.
// A cron token alone must never enable a partially configured integration worker.
const handler = createScheduledWorkerHandler({
  secret: process.env.LIYANNA_WORKER_SECRET,
  enabled: false,
  runOnce: async () => { throw new Error('Worker infrastructure not configured'); },
});
export const POST = handler;

/** Offline, read-only migration preflight. Never executes SQL or connects to a database. */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATION_ORDER = Object.freeze([
  '20261118100000_commercial_foundation.sql',
  '20261118100100_vig_private_connections.sql',
  '20261118100200_vig_event_queue.sql',
  '20261118100300_vig_worker_operations.sql',
  '20261119100000_finbase_review_destinations.sql',
  '20261119110000_finbase_review_preparations.sql',
  '20261120090000_finbase_dispatch_ledger.sql',
]);
export function inspectMigrations(directory) {
  const actual = readdirSync(directory).filter(name => name.endsWith('.sql')).sort();
  const missing = MIGRATION_ORDER.filter(name => !actual.includes(name));
  const unknown = actual.filter(name => !MIGRATION_ORDER.includes(name));
  const problems = [];
  if (missing.length) problems.push(`Missing migrations: ${missing.join(', ')}`);
  if (unknown.length) problems.push(`Unreviewed migrations: ${unknown.join(', ')}`);
  if (actual.join('|') !== MIGRATION_ORDER.join('|')) {
    problems.push('Lexicographic migration order is unsafe: event_outbox references connections before connections is created.');
  }
  const sql = Object.fromEntries(MIGRATION_ORDER.filter(name => actual.includes(name)).map(name => [name, readFileSync(resolve(directory, name), 'utf8')]));
  if (sql['20261118100200_vig_event_queue.sql'] && !/REFERENCES\s+liyanna_integrations\.connections\s*\(/i.test(sql['20261118100200_vig_event_queue.sql'])) problems.push('Outbox foreign-key contract changed');
  if (sql['20261118100300_vig_worker_operations.sql'] && !/SECURITY INVOKER/i.test(sql['20261118100300_vig_worker_operations.sql'])) problems.push('Worker SQL must remain security invoker');
  return { ok: problems.length === 0, problems, actual, requiredOrder: MIGRATION_ORDER };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(fileURLToPath(new URL('../../database/migrations/', import.meta.url)));
  const result = inspectMigrations(directory);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

/** Offline contract check between the worker repository and its private SQL API. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function inspectWorkerContract({ sql, repository }) {
  const problems = [];
  const functions = [
    { name: 'claim_events', args: /\(\s*p_worker\s+uuid\s*,\s*p_limit\s+integer\b/i, signature: /claim_events\s*\(\s*uuid\s*,\s*integer\s*\)/i, query: /claim_events\s*\(\s*\$1::uuid\s*,\s*\$2::integer\s*\)/i },
    { name: 'finish_event', args: /\(\s*p_id\s+uuid\s*,\s*p_worker\s+uuid\s*,\s*p_success\s+boolean\s*,\s*p_error\s+text\b[^)]*p_retry_at\s+timestamptz\b/i, signature: /finish_event\s*\(\s*uuid\s*,\s*uuid\s*,\s*boolean\s*,\s*text\s*,\s*timestamptz\s*\)/i, query: /finish_event\s*\(\s*\$1::uuid\s*,\s*\$2::uuid\s*,\s*(?:true|false)\s*,/i },
  ];
  for (const fn of functions) {
    if (!new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+liyanna_integrations\\.${fn.name}\\s*`, 'i').test(sql) || !fn.args.test(sql)) problems.push(`${fn.name} SQL signature differs from repository contract`);
    if (!new RegExp(`REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+liyanna_integrations\\.${fn.name}\\s*`, 'i').test(sql) || !fn.signature.test(sql)) problems.push(`${fn.name} public execute revocation missing or changed`);
    if (!fn.query.test(repository)) problems.push(`${fn.name} repository call missing or incompatible`);
  }
  if ((sql.match(/SECURITY\s+INVOKER/gi) || []).length < 2) problems.push('Both worker SQL functions must explicitly use SECURITY INVOKER');
  if (/GRANT\s+EXECUTE\s+ON\s+FUNCTION[^;]*\b(?:PUBLIC|anon|authenticated)\b/i.test(sql)) problems.push('Worker SQL function exposed to browser roles');
  return { ok: problems.length === 0, problems };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sql = readFileSync(resolve(root, '../database/migrations/20261118100300_vig_worker_operations.sql'), 'utf8');
  const repository = readFileSync(resolve(root, 'src/integrations/vig/postgres-repository.mjs'), 'utf8');
  const result = inspectWorkerContract({ sql, repository });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

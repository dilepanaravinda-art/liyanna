import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectMigrations, MIGRATION_ORDER } from './verify-migrations.mjs';
function fixture(fn) {
 const dir=mkdtempSync(join(tmpdir(),'liyanna-migrations-'));
 try { for (const name of MIGRATION_ORDER) writeFileSync(join(dir,name),name.includes('event_queue')?'REFERENCES liyanna_integrations.connections(id)':name.includes('worker_operations')?'SECURITY INVOKER':'-- valid'); return fn(dir); }
 finally { rmSync(dir,{recursive:true,force:true}); }
}
test('accepts dependency-ordered migrations',()=>fixture(dir=>{
 assert.equal(inspectMigrations(dir).ok,true);
}));
test('detects missing prerequisite migration',()=>fixture(dir=>{
 
 unlinkSync(join(dir,'20261118100100_vig_private_connections.sql'));
 assert.match(inspectMigrations(dir).problems.join(' '),/Missing migrations/);
}));
test('detects unknown migration',()=>fixture(dir=>{
 writeFileSync(join(dir,'extra.sql'),'-- unexpected');
 assert.match(inspectMigrations(dir).problems.join(' '),/Unreviewed migrations/);
}));
test('detects unsafe function privileges',()=>fixture(dir=>{
 writeFileSync(join(dir,'20261118100300_vig_worker_operations.sql'),'SECURITY DEFINER');
 assert.match(inspectMigrations(dir).problems.join(' '),/security invoker/);
}));

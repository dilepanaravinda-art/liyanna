import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSourceFiles, auditProject } from './verify-secrets.mjs';
test('passes on safe client component', () => assert.equal(auditSourceFiles({'features/one.tsx': `'use client'; const x = 1;`}).ok, true));
test('detects server credential referenced by client', () => assert.equal(auditSourceFiles({'features/one.tsx': `'use client'; const x = process.env.SUPABASE_SERVICE_ROLE_KEY;`}).ok, false));
test('detects NEXT_PUBLIC secret', () => assert.equal(auditSourceFiles({'components/one.tsx': `const x = process.env.NEXT_PUBLIC_DATABASE_URL;`}).ok, false));
test('does not flag server-only source', () => assert.equal(auditSourceFiles({'server/one.ts': `const x = process.env.DATABASE_URL;`}).ok, true));
test('actual source passes offline secret audit', () => assert.equal(auditProject().ok, true));

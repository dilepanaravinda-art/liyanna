import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspectArchiveLayout, inspectArchiveLayoutFile } from './verify-archive-layout.mjs';
const root = resolve(import.meta.dirname, '../..');
test('packaged repository has runnable root workflow', () => assert.equal(inspectArchiveLayoutFile(root).ok, true));
test('rejects missing project working directory', () => assert.equal(inspectArchiveLayout(root, 'pnpm install --frozen-lockfile\npnpm typecheck\npnpm build').ok, false));
test('rejects deploy commands', () => assert.equal(inspectArchiveLayout(root, 'working-directory: project\npnpm install --frozen-lockfile\npnpm typecheck\npnpm build\nvercel deploy').ok, false));

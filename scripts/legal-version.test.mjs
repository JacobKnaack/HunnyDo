import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { versionDate } from '../src/lib/legalVersion.mjs';

test('versionDate reads the date a version starts with', () => {
  assert.equal(versionDate('2026-10-29').toISOString(), '2026-10-29T00:00:00.000Z');
  assert.equal(versionDate('2026-10-29.2').toISOString(), '2026-10-29T00:00:00.000Z');
  assert.equal(versionDate('2024-02-29').toISOString(), '2024-02-29T00:00:00.000Z');
});

test('versionDate refuses what the site could not show as a date', () => {
  for (const version of ['v2', '2026-10', '2026-10-29.', '2026-10-29.x', '2026-10-29-2', '2026-02-31', '2026-13-01', undefined, 20261029]) {
    assert.equal(versionDate(version), null, String(version));
  }
});

// The script run for real, with neither variable set so that it can't reach an API.
const script = fileURLToPath(new URL('./publish-legal.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH } });

test('--dry-run prints a payload per document and sends nothing', () => {
  const { status, stdout } = run('--dry-run');
  assert.equal(status, 0);
  const payloads = stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(payloads.map((payload) => payload.document), ['terms', 'privacy']);
});

test('without the API URL and secret it fails before any request', () => {
  const { status, stderr } = run();
  assert.equal(status, 1);
  assert.match(stderr, /Set HUNNYDO_API_URL and LEGAL_DOCUMENTS_WEBHOOK_SECRET/);
});

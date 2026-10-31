import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAGES, unbumped } from './check-legal-bump.mjs';

const base = { terms: { version: '2026-10-29' }, privacy: { version: '2026-10-29' } };

test('a legal page changed with its version bumped is fine', () => {
  const head = { ...base, terms: { version: '2026-11-01' } };
  assert.deepEqual(unbumped([PAGES.terms], base, head), []);
});

test('a legal page changed with the same version is reported by document', () => {
  assert.deepEqual(unbumped([PAGES.terms, PAGES.privacy], base, base), ['terms', 'privacy']);
  assert.deepEqual(unbumped([PAGES.privacy], base, { ...base, terms: { version: '2026-11-01' } }), ['privacy']);
});

test('unrelated changes and a version bump without a page edit are fine', () => {
  assert.deepEqual(unbumped(['src/styles/legal.css', 'README.md'], base, base), []);
  assert.deepEqual(unbumped([], base, { ...base, privacy: { version: '2026-11-01' } }), []);
});

test('a document that is new in the branch is not reported', () => {
  assert.deepEqual(unbumped([PAGES.terms], {}, base), []);
});

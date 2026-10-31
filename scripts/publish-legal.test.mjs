import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPayloads, post, sign } from './publish-legal.mjs';

const legal = {
  terms: { version: '2026-10-29', url: 'https://hunnydo.cloud/terms-and-conditions' },
  privacy: { version: '2026-10-29', url: 'https://hunnydo.cloud/privacy', summary: '  We list our processors.  ' },
};
const now = new Date('2026-11-01T12:00:00.000Z');

test('sign is the hex HMAC-SHA256 of "timestamp.body"', () => {
  // Computed independently: printf '1762000000.{"a":1}' | openssl dgst -sha256 -hmac secret
  assert.equal(sign('secret', '1762000000', '{"a":1}'), '9a8848657b1a8a8260797d90e3385c949ef7bc7c934f7e8abe0f658c33822da2');
  assert.notEqual(sign('other', '1762000000', '{"a":1}'), '9a8848657b1a8a8260797d90e3385c949ef7bc7c934f7e8abe0f658c33822da2');
  assert.notEqual(sign('secret', '1762000001', '{"a":1}'), '9a8848657b1a8a8260797d90e3385c949ef7bc7c934f7e8abe0f658c33822da2');
});

test('buildPayloads makes one payload per document, effective now, with a trimmed summary', () => {
  assert.deepEqual(buildPayloads(legal, now), [
    { document: 'terms', version: '2026-10-29', effectiveAt: '2026-11-01T12:00:00.000Z', url: 'https://hunnydo.cloud/terms-and-conditions' },
    {
      document: 'privacy',
      version: '2026-10-29',
      effectiveAt: '2026-11-01T12:00:00.000Z',
      url: 'https://hunnydo.cloud/privacy',
      summary: 'We list our processors.',
    },
  ]);
});

test('buildPayloads keeps an effectiveAt the entry gives', () => {
  const [terms] = buildPayloads({ ...legal, terms: { ...legal.terms, effectiveAt: '2026-12-01T00:00:00Z' } }, now);
  assert.equal(terms.effectiveAt, '2026-12-01T00:00:00.000Z');
});

test('buildPayloads refuses what the API would refuse, naming the document', () => {
  const bad = (terms) => () => buildPayloads({ ...legal, terms }, now);
  assert.throws(bad({ ...legal.terms, version: 'has spaces' }), /terms needs a version/);
  assert.throws(bad({ ...legal.terms, version: undefined }), /terms needs a version/);
  assert.throws(bad({ ...legal.terms, url: 'http://hunnydo.cloud/terms' }), /terms needs an https url/);
  assert.throws(bad({ ...legal.terms, summary: 'x'.repeat(501) }), /summary must be text of at most 500/);
  assert.throws(bad({ ...legal.terms, effectiveAt: 'soon' }), /effectiveAt that isn't a date/);
  assert.throws(() => buildPayloads({ terms: legal.terms }, now), /privacy is missing/);
});

const payload = buildPayloads(legal, now)[0];
const reply = (status, text = '') => ({ status, text: async () => text });
const options = (fetchImpl, extra = {}) => ({
  apiUrl: 'https://api.example.com/',
  secret: 'shh',
  fetchImpl,
  now: () => now,
  sleep: async () => {},
  ...extra,
});

test('post sends the signed raw body to /webhooks/legal-documents', async () => {
  let seen;
  const outcome = await post(payload, options(async (url, init) => ((seen = { url, init }), reply(202))));

  assert.equal(outcome, 'created');
  assert.equal(seen.url, 'https://api.example.com/webhooks/legal-documents');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.equal(seen.init.body, JSON.stringify(payload));
  const timestamp = String(Math.floor(now.getTime() / 1000));
  assert.equal(seen.init.headers['X-Hunnydo-Timestamp'], timestamp);
  assert.equal(seen.init.headers['X-Hunnydo-Signature'], sign('shh', timestamp, seen.init.body));
});

test('post tells a repeat version (200) from a new one (202)', async () => {
  assert.equal(await post(payload, options(async () => reply(200))), 'duplicate');
  assert.equal(await post(payload, options(async () => reply(202))), 'created');
});

test('post does not retry a refusal', async () => {
  let calls = 0;
  await assert.rejects(
    post(payload, options(async () => (calls++, reply(400, 'Invalid signature')))),
    /terms: the API answered 400 \(Invalid signature\)/
  );
  assert.equal(calls, 1);
});

test('post retries a server error and a network error, with a fresh timestamp each time', async () => {
  const timestamps = [];
  const answers = [() => reply(503), () => { throw new Error('socket hang up'); }, () => reply(202)];
  let tick = 0;
  const outcome = await post(
    payload,
    options(async (_url, init) => (timestamps.push(init.headers['X-Hunnydo-Timestamp']), answers[timestamps.length - 1]()), {
      now: () => new Date(now.getTime() + 10_000 * tick++),
    })
  );

  assert.equal(outcome, 'created');
  assert.equal(new Set(timestamps).size, 3);
});

test('post gives up after three tries and says what went wrong', async () => {
  let calls = 0;
  await assert.rejects(post(payload, options(async () => (calls++, reply(500)))), /terms: the API answered 500/);
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(post(payload, options(async () => (calls++, Promise.reject(new Error('ECONNREFUSED'))))), /could not reach the API \(ECONNREFUSED\)/);
  assert.equal(calls, 3);
});

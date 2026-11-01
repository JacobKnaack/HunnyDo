import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CONTACTS, MESSAGE_SIGNATURE, buildMailto, contactAttrs, defaultSubject, topicFromTitle } from '../src/lib/contact.mjs';
import { LEGAL_EMAIL, SUPPORT_EMAIL } from '../src/lib/site.mjs';

test('contact links carry the recipient kind, a mailto fallback, and an optional topic', () => {
  assert.deepEqual(contactAttrs('support'), { href: `mailto:${SUPPORT_EMAIL}`, 'data-contact': 'support' });
  assert.deepEqual(contactAttrs('legal', 'Privacy Notice'), {
    href: `mailto:${LEGAL_EMAIL}`,
    'data-contact': 'legal',
    'data-contact-topic': 'Privacy Notice',
  });
});

test('subjects are prefixed by the kind of contact', () => {
  assert.equal(defaultSubject('support', 'Page not found'), 'HunnyDo Support - Page not found');
  assert.equal(defaultSubject('legal', 'Privacy Notice'), 'HunnyDo Legal - Privacy Notice');
  assert.equal(defaultSubject('support'), 'HunnyDo Support');
});

test('page titles lose their branding', () => {
  assert.equal(topicFromTitle('Page not found — HunnyDo'), 'Page not found');
  assert.equal(topicFromTitle('HunnyDo — Brand Kit'), 'Brand Kit');
  assert.equal(topicFromTitle('HunnyDo'), 'HunnyDo');
});

test('the mailto uses the visitor\'s subject and message, followed by the signature', () => {
  const url = new URL(buildMailto({ to: SUPPORT_EMAIL, subject: 'Q & A: 100%', message: 'Hi there\nSecond line ' }));
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, SUPPORT_EMAIL);
  assert.equal(url.searchParams.get('subject'), 'Q & A: 100%');
  assert.equal(url.searchParams.get('body'), `Hi there\nSecond line\n\n${MESSAGE_SIGNATURE}`);
  assert.equal(MESSAGE_SIGNATURE, 'Sent from hunnydo.cloud');
  assert.ok(!buildMailto({ to: 'a@b.c', subject: 'a b', message: 'x' }).includes('+'));
});

test('both contacts have an address', () => {
  for (const { email } of Object.values(CONTACTS)) assert.match(email, /^[^@\s]+@[^@\s]+$/);
});

// Addresses belong in site.mjs. The legal pages are allowed to keep theirs until they are next republished, since
// editing them requires a new legal version (see "Legal documents" in the README). fernwell.astro only has a sample
// value in a demo input.
const ALLOWED = new Set([
  'lib/site.mjs',
  'lib/contact.mjs',
  'pages/fernwell.astro',
  'pages/privacy.astro',
  'pages/terms-and-conditions.astro',
]);

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

test('no page hardcodes an email address or mailto link', () => {
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  const offenders = sourceFiles(src)
    .map((file) => file.slice(src.length))
    .filter((file) => !ALLOWED.has(file) && /\.(astro|mjs|ts|mdx?|json)$/.test(file))
    .filter((file) => /mailto:|[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(readFileSync(join(src, file), 'utf8')));
  assert.deepEqual(offenders, []);
});

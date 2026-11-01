import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { softwareApplication } from '../src/lib/jsonld.mjs';
import { PLANS } from '../src/lib/plans.mjs';
import { LEGAL_PAGES, OPTIONAL_PAGES, SITE_PAGES, buildLlmsTxt, sitePaths } from '../src/lib/llms.mjs';
import { linkProblems, problems } from './check-llms.mjs';

const legal = JSON.parse(readFileSync(new URL('../src/legal.json', import.meta.url), 'utf8'));
const posts = [
  { slug: 'newer-post', title: 'A newer post', description: 'It is new.', date: new Date('2026-10-31') },
  { slug: 'older-post', title: 'An older post', description: 'It is [old]\nand wraps.', date: new Date('2026-01-02') },
];

test('the file is well-formed', () => {
  assert.deepEqual(problems(buildLlmsTxt({ posts, legal })), []);
  assert.deepEqual(problems(buildLlmsTxt({ posts: [], legal })), []);
});

test('the summary comes from the JSON-LD builder', () => {
  assert.ok(buildLlmsTxt({ posts, legal }).includes(`> ${softwareApplication().description}`));
});

test('the Plans section lists each plan with its price and features', () => {
  const text = buildLlmsTxt({ posts, legal });
  const plans = text.split('## Plans\n\n')[1].split('\n\n## ')[0];
  assert.ok(plans.includes('- **Personal**: $0/month. '));
  assert.ok(plans.includes('- **Professional**: $5/month. '));
  for (const plan of PLANS) {
    for (const feature of plan.features) assert.ok(plans.includes(`  - ${feature}\n`) || plans.endsWith(`  - ${feature}`));
  }
  assert.equal(plans.split('\n').filter((line) => line.startsWith('  - ')).length, PLANS.flatMap((p) => p.features).length);
});

test('a changed plan shows up in llms.txt and the JSON-LD offers without other edits', () => {
  const original = structuredClone(PLANS);
  try {
    PLANS[1].price = 9;
    PLANS[1].features.push('Priority support');
    assert.ok(buildLlmsTxt({ posts, legal }).includes('- **Professional**: $9/month.'));
    assert.ok(buildLlmsTxt({ posts, legal }).includes('  - Priority support'));
    assert.equal(softwareApplication().offers[1].price, '9');
  } finally {
    PLANS.splice(0, PLANS.length, ...original);
  }
});

test('posts are listed in the order given, one line each, with absolute .html URLs', () => {
  const text = buildLlmsTxt({ posts, legal });
  const lines = text.split('\n').filter((line) => line.includes('/blog/'));
  assert.equal(lines.length, 2);
  assert.equal(lines[0], '- [A newer post](https://hunnydo.cloud/blog/newer-post.html): 2026-10-31. It is new.');
  assert.equal(lines[1], '- [An older post](https://hunnydo.cloud/blog/older-post.html): 2026-01-02. It is [old] and wraps.');
});

test('the Blog section is left out when there are no posts', () => {
  assert.ok(!buildLlmsTxt({ posts: [], legal }).includes('## Blog'));
});

test('legal pages carry the version from legal.json', () => {
  const text = buildLlmsTxt({ posts, legal });
  assert.ok(text.includes(`Version ${legal.privacy.version}.`));
  assert.ok(text.includes(`Version ${legal.terms.version}.`));
});

test('every site page is built into the right file', () => {
  const paths = sitePaths(posts);
  for (const page of [...SITE_PAGES, ...LEGAL_PAGES, ...OPTIONAL_PAGES]) assert.ok(paths.includes(page.path));
  assert.ok(paths.includes('/blog/newer-post.html'));
});

test('problems flags a malformed file', () => {
  const good = buildLlmsTxt({ posts, legal });
  assert.ok(problems(good.replace('# HunnyDo', '# Other')).length);
  assert.ok(problems(good.replace('> ', '')).length);
  assert.ok(problems(good.replace('## Legal', '## Terms')).some((p) => p.includes('Legal')));
  assert.ok(problems(good.replace('## Plans', '## Pricing')).some((p) => p.includes('Plans')));
  assert.ok(problems(`${good}- not a link\n`).some((p) => p.startsWith('malformed list line')));
  assert.ok(problems(`${good}\n`).length);
});

test('linkProblems compares links with the built pages', () => {
  const dist = mkdtempSync(join(tmpdir(), 'llms-'));
  try {
    mkdirSync(join(dist, 'blog'));
    mkdirSync(join(dist, '_astro'));
    for (const path of [
      'index.html',
      '404.html',
      'blog.html',
      'brand-kit.html',
      'fernwell.html',
      'privacy.html',
      'terms-and-conditions.html',
      'blog/newer-post.html',
      'blog/older-post.html',
      '_astro/ignored.html',
    ]) {
      writeFileSync(join(dist, path), '<html></html>');
    }
    const text = buildLlmsTxt({ posts, legal });
    assert.deepEqual(linkProblems(text, dist), []);

    // a published post missing from the list
    const unlisted = buildLlmsTxt({ posts: posts.slice(1), legal });
    assert.deepEqual(linkProblems(unlisted, dist), ['/blog/newer-post.html was built but is not linked']);

    // a listed post that was not built (a draft, say)
    rmSync(join(dist, 'blog', 'older-post.html'));
    assert.deepEqual(linkProblems(text, dist), ['links to /blog/older-post.html, which was not built']);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

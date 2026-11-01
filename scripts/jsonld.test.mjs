import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  blogPosting,
  breadcrumbList,
  normalizePath,
  organization,
  renderJsonLd,
  staticPageSchemas,
  webSite,
} from '../src/lib/jsonld.mjs';
import { versionDate } from '../src/lib/legalVersion.mjs';
import { problems } from './check-jsonld.mjs';

const legal = JSON.parse(readFileSync(new URL('../src/legal.json', import.meta.url), 'utf8'));
const page = (pathname, canonical = `https://hunnydo.cloud${pathname}`) => ({
  pathname,
  canonical,
  title: 'Title',
  description: 'Description',
  legal,
});

test('normalizePath drops the .html that build.format "file" adds', () => {
  assert.equal(normalizePath('/privacy.html'), '/privacy');
  assert.equal(normalizePath('/blog/some-post.html'), '/blog/some-post');
  assert.equal(normalizePath('/index.html'), '/');
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('/blog/'), '/blog');
});

test('the home page gets the SoftwareApplication, and other pages do not', () => {
  assert.deepEqual(staticPageSchemas(page('/index.html')).map((node) => node['@type']), ['SoftwareApplication']);
  assert.deepEqual(staticPageSchemas(page('/blog.html')).map((node) => node['@type']), ['CollectionPage']);
  assert.deepEqual(staticPageSchemas(page('/404.html')), []);
});

test('legal pages take dateModified from the version in legal.json, and url from the canonical', () => {
  for (const [path, document] of [['/privacy.html', 'privacy'], ['/terms-and-conditions.html', 'terms']]) {
    const [node] = staticPageSchemas(page(path));
    assert.equal(node['@type'], 'WebPage');
    assert.equal(node.url, `https://hunnydo.cloud${path}`);
    assert.equal(node.dateModified, versionDate(legal[document].version).toISOString());
  }
});

test('a blog post falls back to its publish date when it was never updated', () => {
  const date = new Date('2026-10-31');
  const base = { url: 'https://hunnydo.cloud/blog/x.html', headline: 'X', description: 'x', datePublished: date, author: 'A' };
  assert.equal(blogPosting(base).dateModified, date.toISOString());
  assert.equal(blogPosting({ ...base, dateModified: new Date('2026-11-02') }).dateModified, '2026-11-02T00:00:00.000Z');
  assert.equal('image' in blogPosting(base), false);
  assert.equal(blogPosting({ ...base, keywords: ['a', 'b'] }).keywords, 'a, b');
  assert.throws(() => blogPosting({ ...base, datePublished: 'not a date' }), /not a date/);
});

test('breadcrumbList numbers its items from 1', () => {
  const list = breadcrumbList([{ name: 'Blog', url: 'https://hunnydo.cloud/blog.html' }, { name: 'Post', url: 'https://hunnydo.cloud/blog/p.html' }]);
  assert.deepEqual(list.itemListElement.map((item) => item.position), [1, 2]);
});

test('renderJsonLd makes one graph and keeps the first node for a repeated @id', () => {
  const { '@context': context, '@graph': graph } = JSON.parse(
    renderJsonLd([organization(), webSite(), { ...organization(), name: 'Other' }, breadcrumbList([])]),
  );
  assert.equal(context, 'https://schema.org');
  assert.deepEqual(graph.map((node) => node['@type']), ['Organization', 'WebSite', 'BreadcrumbList']);
  assert.equal(graph[0].name, 'HunnyDo');
});

test('renderJsonLd cannot be broken out of by a title', () => {
  const out = renderJsonLd([{ '@type': 'WebPage', name: '</script><script>alert(1)</script>\u2028' }]);
  assert.equal(out.includes('<'), false);
  assert.equal(out.includes('\u2028'), false);
  assert.equal(JSON.parse(out)['@graph'][0].name, '</script><script>alert(1)</script>\u2028');
});

const built = (graph, canonical = 'https://hunnydo.cloud/x.html') =>
  `<html><head><link rel="canonical" href="${canonical}"><script type="application/ld+json">${renderJsonLd(graph)}</script></head></html>`;

test('check-jsonld accepts the layout output and flags what Google would ignore', () => {
  const ok = built([organization(), webSite()]);
  assert.deepEqual(problems(ok), []);
  assert.match(problems('<html></html>')[0], /exactly one/);
  assert.match(problems('<script type="application/ld+json">{</script>')[0], /not valid JSON/);
  assert.match(problems(built([webSite()])).join(), /no Organization/);
  assert.match(problems(built([organization(), webSite()]), { isPost: true }).join(), /no BlogPosting/);
  const wrongUrl = built([organization(), webSite(), { '@type': 'WebPage', url: 'https://hunnydo.cloud/other' }]);
  assert.match(problems(wrongUrl).join(), /is not the canonical/);
});

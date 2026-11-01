#!/usr/bin/env node
// Checks the JSON-LD in the built pages, so a page that ships structured data Google would ignore fails the build
// rather than quietly losing its rich results. Runs after `astro build` (see the `build` script in package.json).
//
//   node scripts/check-jsonld.mjs [dist]
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
const CANONICAL = /<link rel="canonical" href="([^"]+)"/;
const PAGE_TYPES = new Set(['WebPage', 'CollectionPage', 'BlogPosting']);

const isAbsolute = (value) => typeof value === 'string' && /^https:\/\//.test(value);

/** The problems with one page's JSON-LD, as strings; empty if it is fine. `isPost` pages must describe a blog post. */
export function problems(html, { isPost = false } = {}) {
  const blocks = [...html.matchAll(SCRIPT)].map((match) => match[1]);
  if (blocks.length !== 1) return [`expected exactly one ld+json script, found ${blocks.length}`];

  let data;
  try {
    data = JSON.parse(blocks[0]);
  } catch (error) {
    return [`ld+json is not valid JSON: ${error.message}`];
  }

  const found = [];
  const graph = data['@graph'];
  if (data['@context'] !== 'https://schema.org') found.push('missing "@context": "https://schema.org"');
  if (!Array.isArray(graph) || graph.length === 0) return [...found, 'missing "@graph"'];

  const types = graph.map((node) => node['@type']);
  for (const required of ['Organization', 'WebSite', ...(isPost ? ['BlogPosting', 'BreadcrumbList'] : [])]) {
    if (!types.includes(required)) found.push(`no ${required} node`);
  }

  const canonical = CANONICAL.exec(html)?.[1];
  for (const node of graph) {
    if (!node['@type']) found.push('a node has no @type');
    if (PAGE_TYPES.has(node['@type']) && canonical && node.url !== canonical) {
      found.push(`${node['@type']} url ${node.url} is not the canonical ${canonical}`);
    }
    for (const key of ['url', 'logo']) {
      if (key in node && !isAbsolute(node[key])) found.push(`${node['@type']}.${key} is not an absolute https URL`);
    }
  }
  return found;
}

function* htmlFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

function main(dist) {
  let failed = 0;
  let checked = 0;
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, 'utf8');
    if (!html.includes('<html')) continue;
    checked += 1;
    const name = relative(dist, file);
    const found = problems(html, { isPost: name.startsWith('blog/') });
    for (const problem of found) console.error(`${name}: ${problem}`);
    if (found.length) failed += 1;
  }
  if (checked === 0) {
    console.error(`No pages found in ${dist}; build the site first.`);
    process.exit(1);
  }
  if (failed) {
    console.error(`JSON-LD problems in ${failed} of ${checked} pages.`);
    process.exit(1);
  }
  console.log(`JSON-LD ok in ${checked} pages.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv[2] ?? 'dist');
}

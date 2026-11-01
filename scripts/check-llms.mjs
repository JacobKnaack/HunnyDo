#!/usr/bin/env node
// Checks the built dist/llms.txt against the rest of dist/: it must be well-formed, every link to this site must be a
// page that was built, and every page that was built (except the 404) must be linked. Runs after `astro build` (see the
// `build` script in package.json), so a new page or post can't ship without being in llms.txt, and a page that isn't
// published can't be listed in it.
//
//   node scripts/check-llms.mjs [dist]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_NAME, SITE_URL } from '../src/lib/site.mjs';

const LIST_LINE = /^- \[[^\]]+\]\((https:\/\/[^)\s]+)\)(?:: \S.*)?$/;
const REQUIRED_SECTIONS = ['Plans', 'Product', 'Site', 'Legal', 'Optional'];

/** The problems with the text of an llms.txt, as strings; empty if it is fine. */
export function problems(text) {
  const found = [];
  const lines = text.split('\n');

  if (lines[0] !== `# ${SITE_NAME}`) found.push(`first line must be "# ${SITE_NAME}"`);
  if (!/^> \S/.test(lines[2] ?? '')) found.push('the H1 must be followed by a "> summary" blockquote');

  const sections = lines.filter((line) => line.startsWith('## ')).map((line) => line.slice(3));
  for (const required of REQUIRED_SECTIONS) {
    if (!sections.includes(required)) found.push(`missing "## ${required}" section`);
  }
  if (sections.at(-1) !== 'Optional') found.push('"## Optional" must be the last section');

  // Every list line is a link, except the plans, which are a name and price followed by their features.
  let current;
  for (const line of lines) {
    if (line.startsWith('## ')) current = line.slice(3);
    else if (line.startsWith('- ') && current !== 'Plans' && !LIST_LINE.test(line)) found.push(`malformed list line: ${line}`);
  }
  if (!text.endsWith('\n') || text.endsWith('\n\n')) found.push('must end with exactly one newline');
  return found;
}

/** Built pages as the paths their URLs use: `/`, `/privacy.html`, `/blog/some-post.html`. */
function builtPaths(dist) {
  const paths = [];
  const walk = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_') && entry.name !== 'assets') walk(join(directory, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.html')) {
        paths.push(`${prefix}${entry.name}`);
      }
    }
  };
  walk(dist, '/');
  return paths.filter((path) => path !== '/404.html').map((path) => (path === '/index.html' ? '/' : path));
}

/** The problems with how the links in `text` line up with the pages built into `dist`. */
export function linkProblems(text, dist) {
  const found = [];
  const linked = [];
  for (const line of text.split('\n')) {
    const url = LIST_LINE.exec(line)?.[1];
    if (url?.startsWith(`${SITE_URL}/`)) linked.push(url.slice(SITE_URL.length));
  }

  const built = builtPaths(dist);
  for (const path of linked) {
    if (!built.includes(path)) found.push(`links to ${path}, which was not built`);
  }
  for (const path of built) {
    if (!linked.includes(path)) found.push(`${path} was built but is not linked`);
  }
  const duplicates = linked.filter((path, index) => linked.indexOf(path) !== index);
  for (const path of new Set(duplicates)) found.push(`${path} is linked more than once`);
  return found;
}

function main(dist) {
  const file = join(dist, 'llms.txt');
  if (!existsSync(file)) {
    console.error(`${file} not found; build the site first.`);
    process.exit(1);
  }
  const text = readFileSync(file, 'utf8');
  const found = [...problems(text), ...linkProblems(text, dist)];
  for (const problem of found) console.error(`llms.txt: ${problem}`);
  if (found.length) {
    console.error(`llms.txt has ${found.length} problem${found.length === 1 ? '' : 's'}.`);
    process.exit(1);
  }
  console.log(`llms.txt ok (${text.split('\n').filter((line) => line.startsWith('- ')).length} links).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv[2] ?? 'dist');
}

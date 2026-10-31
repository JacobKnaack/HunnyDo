#!/usr/bin/env node
// Fails a pull request that edits a legal page without bumping that document's version in src/legal.json. Without a
// bump the deploy tells the API nothing, so users are never told the document changed.
//
//   node scripts/check-legal-bump.mjs origin/main
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PAGES = {
  terms: 'src/pages/terms-and-conditions.astro',
  privacy: 'src/pages/privacy.astro',
};

/** The documents whose page is in `changedFiles` but whose version is the same in `baseLegal` and `headLegal`. */
export function unbumped(changedFiles, baseLegal, headLegal) {
  return Object.entries(PAGES)
    .filter(([, page]) => changedFiles.includes(page))
    .filter(([document]) => baseLegal?.[document]?.version === headLegal?.[document]?.version)
    .map(([document]) => document);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function baseHasLegal(base) {
  try {
    git('cat-file', '-e', `${base}:src/legal.json`);
    return true;
  } catch {
    return false;
  }
}

function checkLegalBump() {
  const base = process.argv[2];
  if (!base) throw new Error('Usage: check-legal-bump.mjs <base ref>, e.g. origin/main');

  const changedFiles = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  // The branch that introduces src/legal.json has no base version to compare with, so there is nothing to bump yet.
  const baseLegal = baseHasLegal(base) ? JSON.parse(git('show', `${base}:src/legal.json`)) : null;
  const headLegal = JSON.parse(git('show', 'HEAD:src/legal.json'));

  const missing = unbumped(changedFiles, baseLegal, headLegal);
  if (missing.length) {
    const list = missing.map((document) => `${document} (${PAGES[document]})`).join(', ');
    throw new Error(
      `Changed without a new version in src/legal.json: ${list}.\n` +
        'Bump the version so users are notified (see "Legal documents" in the README).'
    );
  }
  console.log('Legal pages and versions agree.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    checkLegalBump();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

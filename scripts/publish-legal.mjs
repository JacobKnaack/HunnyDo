#!/usr/bin/env node
// Tells the HunnyDo API which version of the Terms and the Privacy Policy this site is serving, so it can show users
// the "our terms changed" banner and email them. Run by the deploy workflow after the site is live, and by hand:
//
//   HUNNYDO_API_URL=https://api.example.com LEGAL_DOCUMENTS_WEBHOOK_SECRET=... npm run legal:publish
//   npm run legal:publish -- --dry-run     # prints what would be sent; needs neither variable
//
// The versions come from src/legal.json, which is also what the pages' "Last updated" line reads. Both documents are
// sent every time: the API records a version once and answers a repeat with 200 and does nothing, so only a version
// that was bumped notifies anyone.
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { versionDate } from '../src/lib/legalVersion.mjs';

const DOCUMENTS = ['terms', 'privacy'];
// The API's own limit (src/lib/legalDocumentsWebhook.ts there), checked here so a mistake fails before any request.
// Versions are held to a stricter shape than the API asks for (see versionDate): the site has to be able to show them.
const MAX_SUMMARY = 500;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const REQUEST_TIMEOUT_MS = 10_000;

/** hex HMAC-SHA256 of `${timestamp}.${rawBody}`: what the API recomputes to check the sender holds the secret. */
export function sign(secret, timestamp, rawBody) {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

/**
 * The webhook payload for each document in `legal` (the parsed src/legal.json). A version takes effect when it is
 * published, so `effectiveAt` is now, unless the entry gives one.
 */
export function buildPayloads(legal, now = new Date()) {
  return DOCUMENTS.map((document) => {
    const entry = legal?.[document];
    const fail = (problem) => {
      throw new Error(`legal.json: ${document} ${problem}`);
    };
    if (!entry) fail('is missing');
    if (!versionDate(entry.version)) {
      fail(`needs a version like "2026-11-01" or "2026-11-01.2" (a real date), got ${JSON.stringify(entry.version)}`);
    }
    if (typeof entry.url !== 'string' || !/^https:\/\//.test(entry.url)) fail('needs an https url');
    if (entry.summary !== undefined && (typeof entry.summary !== 'string' || entry.summary.length > MAX_SUMMARY)) {
      fail(`summary must be text of at most ${MAX_SUMMARY} characters`);
    }
    const effectiveAt = entry.effectiveAt ?? now.toISOString();
    if (Number.isNaN(Date.parse(effectiveAt))) fail(`has an effectiveAt that isn't a date: ${JSON.stringify(effectiveAt)}`);

    return {
      document,
      version: entry.version,
      effectiveAt: new Date(effectiveAt).toISOString(),
      url: entry.url,
      ...(entry.summary?.trim() ? { summary: entry.summary.trim() } : {}),
    };
  });
}

/**
 * Posts one payload, signed. A network error or a 5xx is tried again (with a fresh timestamp, since the API refuses a
 * stale one); anything else is the answer. Resolves with what the API said: `created` for a new version (202),
 * `duplicate` for one it already had (200). Rejects for any other status.
 */
export async function post(payload, { apiUrl, secret, fetchImpl = fetch, now = () => new Date(), sleep = defaultSleep }) {
  const body = JSON.stringify(payload);
  const url = `${apiUrl.replace(/\/+$/, '')}/webhooks/legal-documents`;
  let lastError;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const timestamp = String(Math.floor(now().getTime() / 1000));
    let response = null;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hunnydo-Timestamp': timestamp,
          'X-Hunnydo-Signature': sign(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = new Error(`${payload.document}: could not reach the API (${err.message})`);
    }

    if (response?.status === 202) return 'created';
    if (response?.status === 200) return 'duplicate';
    if (response) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      lastError = new Error(`${payload.document}: the API answered ${response.status}${detail ? ` (${detail})` : ''}`);
      // A refusal (a bad signature, a bad payload) won't change on a second try; only a server error might.
      if (response.status < 500) throw lastError;
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  throw lastError;
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function publishLegal() {
  const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
  const legal = JSON.parse(await readFile(fileURLToPath(new URL('../src/legal.json', import.meta.url)), 'utf8'));
  const payloads = buildPayloads(legal);

  if (values['dry-run']) {
    for (const payload of payloads) console.log(JSON.stringify(payload));
    return;
  }

  const apiUrl = process.env.HUNNYDO_API_URL?.trim();
  const secret = process.env.LEGAL_DOCUMENTS_WEBHOOK_SECRET;
  if (!apiUrl || !secret) {
    throw new Error('Set HUNNYDO_API_URL and LEGAL_DOCUMENTS_WEBHOOK_SECRET (or pass --dry-run).');
  }

  const failed = [];
  for (const payload of payloads) {
    try {
      const outcome = await post(payload, { apiUrl, secret });
      console.log(
        outcome === 'created'
          ? `${payload.document} ${payload.version}: new version recorded; users will be notified.`
          : `${payload.document} ${payload.version}: already recorded; nothing sent.`
      );
    } catch (err) {
      failed.push(payload.document);
      console.error(err.message);
    }
  }
  if (failed.length) {
    // The other documents may already have notified users; a repeat is harmless, so re-running the job is the fix.
    console.error(`Not published: ${failed.join(', ')}. Re-run the job; versions the API already has are skipped.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  publishLegal().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

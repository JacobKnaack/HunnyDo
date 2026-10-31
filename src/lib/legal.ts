import legal from '../legal.json';
import { versionDate } from './legalVersion.mjs';

export type LegalDocument = keyof typeof legal;

/**
 * The "Last updated" line of a legal page, from the version in `src/legal.json`, so the date a visitor reads and the
 * version the deploy publishes to the API can't drift apart. Versions start with a date: `2026-10-29` is
 * "October 29, 2026", and a second revision that day, `2026-10-29.2`, shows the same date. Anything else fails the
 * build rather than putting "Invalid Date" on a legal page.
 */
export function lastUpdated(document: LegalDocument): string {
  const { version } = legal[document];
  const date = versionDate(version);
  if (!date) {
    throw new Error(`src/legal.json: ${document} needs a version like "2026-11-01" or "2026-11-01.2", got ${JSON.stringify(version)}`);
  }
  return date.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
}

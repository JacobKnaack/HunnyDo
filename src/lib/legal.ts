import legal from '../legal.json';

export type LegalDocument = keyof typeof legal;

/**
 * The "Last updated" line of a legal page, from the version in `src/legal.json`, so the date a visitor reads and the
 * version the deploy publishes to the API can't drift apart. Versions start with a date: `2026-10-29` is
 * "October 29, 2026", and a second revision that day, `2026-10-29.2`, shows the same date.
 */
export function lastUpdated(document: LegalDocument): string {
  const [year, month, day] = legal[document].version.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
}

// What counts as a legal document version. Shared by the site (the "Last updated" line) and scripts/publish-legal.mjs
// (the webhook), so a version that publishes can always be displayed, and the other way round.

// A date, `2026-10-29`, optionally followed by `.2`, `.3`... for another revision the same day.
const VERSION_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:\.\d+)?$/;

/** The calendar date (UTC midnight) a version starts with, or null if it isn't a real date such as `2026-02-31`. */
export function versionDate(version) {
  const match = typeof version === 'string' ? VERSION_PATTERN.exec(version) : null;
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? date : null;
}

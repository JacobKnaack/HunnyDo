// Builders for the JSON-LD (schema.org) that BaseLayout puts in every page's <head>. Pure functions with no Astro
// imports, so scripts/jsonld.test.mjs can exercise them directly.
//
// Every page gets Organization + WebSite. Pages whose schema needs no data (home, blog index, legal, design pages) are
// described by the route table in `staticPageSchemas`, so they need no edits. Pages with data of their own (a blog
// post) build their nodes here and pass them to BaseLayout's `jsonLd` prop.

import { versionDate } from './legalVersion.mjs';
import { PLANS } from './plans.mjs';
import { LOGO_URL, SITE_NAME, SITE_URL } from './site.mjs';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organization() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
  };
}

export function webSite() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function softwareApplication() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/`,
    description:
      'HunnyDo is a checklist tool that automatically follows up until every item is checked off — used by realtors, mortgage brokers, and agencies to collect documents from clients, and by individuals for trip planning and household tasks.',
    offers: PLANS.map(({ name, price, priceValidUntil }) => ({
      '@type': 'Offer',
      name,
      price: String(price),
      priceCurrency: 'USD',
      ...(priceValidUntil && { priceValidUntil }),
    })),
  };
}

export function webPage({ url, name, description, dateModified, type = 'WebPage' }) {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    ...(description && { description }),
    ...(dateModified && { dateModified: toISODate(dateModified) }),
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function collectionPage(fields) {
  return webPage({ ...fields, type: 'CollectionPage' });
}

/** `items` are `{ name, url }` from the top of the site down to the current page. */
export function breadcrumbList(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, url }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: url,
    })),
  };
}

export function blogPosting({ url, headline, description, datePublished, dateModified, author, image, keywords }) {
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline,
    description,
    datePublished: toISODate(datePublished),
    dateModified: toISODate(dateModified ?? datePublished),
    author: { '@type': 'Person', name: author },
    publisher: { '@id': ORGANIZATION_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(image && { image }),
    ...(keywords?.length && { keywords: keywords.join(', ') }),
  };
}

/** Drops the trailing `.html` / `/index.html` that `build.format: 'file'` puts in paths, so `/privacy.html` is `/privacy`. */
export function normalizePath(pathname) {
  const path = pathname.replace(/(?:^|\/)index\.html$/, '/').replace(/\.html$/, '');
  return path.length > 1 ? path.replace(/\/$/, '') : path || '/';
}

const PLAIN_PAGES = new Set(['/brand-kit', '/fernwell']);

/**
 * Schema for pages that need nothing but their own URL. `canonical` is the URL the layout emits for the page, so the
 * schema can't disagree with `<link rel="canonical">`. `legal` is `src/legal.json`: the legal pages take their
 * `dateModified` from its versions, the same ones the page prints and the deploy publishes.
 */
export function staticPageSchemas({ pathname, canonical, title, description, legal }) {
  const path = normalizePath(pathname);
  const page = { url: canonical, name: title, description };

  if (path === '/') return [softwareApplication()];
  if (path === '/blog') return [collectionPage(page)];
  if (path === '/privacy' || path === '/terms-and-conditions') {
    const document = path === '/privacy' ? 'privacy' : 'terms';
    return [webPage({ ...page, dateModified: versionDate(legal[document].version) })];
  }
  if (PLAIN_PAGES.has(path)) return [webPage(page)];
  return [];
}

function toISODate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`jsonld: ${JSON.stringify(value)} is not a date`);
  return date.toISOString();
}

/**
 * One `<script type="application/ld+json">` body: a single @graph, with nodes that share an `@id` collapsed to the
 * first. Characters that could end the script element early (titles and descriptions come from frontmatter) are escaped.
 */
export function renderJsonLd(nodes) {
  const seen = new Set();
  const graph = nodes.filter(Boolean).filter((node) => {
    const id = node['@id'];
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

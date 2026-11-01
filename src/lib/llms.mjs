// Builds /llms.txt (https://llmstxt.org): a markdown index of the site for LLMs. Pure functions with no Astro imports,
// so scripts/llms.test.mjs can exercise them directly.
//
// The summary comes from the same builder as the JSON-LD (`softwareApplication`), and the plans from src/lib/plans.mjs,
// which also feeds the home page and the JSON-LD, so none of them can drift. The blog list is whatever the caller passes in. src/pages/llms.txt.ts passes `getAllPosts()`, which is exactly
// the set of posts the production build writes to dist/blog/. scripts/check-llms.mjs checks the built file against
// dist/, so a page or post that is built but not listed (or the reverse) fails the build.

import { softwareApplication } from './jsonld.mjs';
import { PLANS } from './plans.mjs';
import { SITE_NAME, SITE_URL } from './site.mjs';

export const APP_URL = 'https://app.hunnydo.cloud';

/** Product links that live on the app, not this site. */
export const PRODUCT_LINKS = [
  { title: 'HunnyDo app', url: `${APP_URL}/`, description: 'Sign in to build checklists and track what is outstanding.' },
  { title: 'Sign up', url: `${APP_URL}/signup`, description: 'Create a free account.' },
  { title: 'API documentation', url: `${APP_URL}/api/docs`, description: 'Reference for the HunnyDo API.' },
  { title: 'Support', url: `${APP_URL}/support`, description: 'Help, and how to contact the HunnyDo team.' },
];

/** Pages of this site with no data of their own. `path` is the built file, as the canonical URL spells it. */
export const SITE_PAGES = [
  {
    title: 'Home',
    path: '/',
    description: 'What HunnyDo does, who uses it, and pricing.',
  },
  {
    title: 'Blog',
    path: '/blog.html',
    description: 'Product updates, guides, and case studies from the HunnyDo team.',
  },
];

export const OPTIONAL_PAGES = [
  {
    title: 'Brand kit',
    path: '/brand-kit.html',
    description: 'The HunnyDo logomark, wordmark, color palette, and icon system.',
  },
  {
    title: 'Fernwell design language',
    path: '/fernwell.html',
    description: "The design language behind HunnyDo's product UI: color, type, shape, components, motion, and voice.",
  },
];

/** `document` keys are the ones in src/legal.json. */
export const LEGAL_PAGES = [
  {
    title: 'Privacy Notice',
    path: '/privacy.html',
    document: 'privacy',
    description: 'How HunnyDo collects, uses, and shares personal information, and your rights.',
  },
  {
    title: 'Terms and Conditions',
    path: '/terms-and-conditions.html',
    document: 'terms',
    description: 'The terms that govern your use of HunnyDo.',
  },
];

export const postPath = (slug) => `/blog/${slug}.html`;

const absolute = (path) => `${SITE_URL}${path}`;

/** Every page of this site the file links to, as built paths (`/privacy.html`). */
export function sitePaths(posts) {
  return [...SITE_PAGES, ...LEGAL_PAGES, ...OPTIONAL_PAGES].map((page) => page.path).concat(posts.map((p) => postPath(p.slug)));
}

// One list line must stay one line, or the markdown list breaks.
const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim();

function link({ title, url, description }) {
  const entry = `- [${oneLine(title).replace(/([[\]])/g, '\\$1')}](${url})`;
  return description ? `${entry}: ${oneLine(description)}` : entry;
}

const pageLink = (page, extra = '') =>
  link({ title: page.title, url: absolute(page.path), description: `${page.description}${extra}` });

function section(heading, lines) {
  return `## ${heading}\n\n${lines.join('\n')}`;
}

/** One plan: its name, price and description, then its features as a nested list. */
function planEntry({ name, price, description, features }) {
  const lines = [`- **${oneLine(name)}**: $${price}/month. ${oneLine(description)}`];
  return lines.concat(features.map((feature) => `  - ${oneLine(feature)}`)).join('\n');
}

/**
 * The text of /llms.txt. `posts` are `{ slug, title, description, date }` for the published blog posts, in the order to
 * list them; `legal` is src/legal.json, whose versions are the ones the legal pages print.
 */
export function buildLlmsTxt({ posts, legal }) {
  const app = softwareApplication();

  const blog = posts.map((post) =>
    link({
      title: post.title,
      url: absolute(postPath(post.slug)),
      description: `${post.date.toISOString().slice(0, 10)}. ${post.description}`,
    }),
  );

  const blocks = [
    `# ${SITE_NAME}`,
    `> ${oneLine(app.description)}`,
    `The product is a web app at ${APP_URL}; this site, ${SITE_URL}, is its marketing site, blog, and legal documents.`,
    section('Plans', PLANS.map(planEntry)),
    section('Product', PRODUCT_LINKS.map(link)),
    section('Site', SITE_PAGES.map((page) => pageLink(page))),
    section(
      'Legal',
      LEGAL_PAGES.map((page) => pageLink(page, ` Version ${legal[page.document].version}.`)),
    ),
  ];
  if (blog.length) blocks.push(section('Blog', blog));
  blocks.push(section('Optional', OPTIONAL_PAGES.map((page) => pageLink(page))));

  return `${blocks.join('\n\n')}\n`;
}

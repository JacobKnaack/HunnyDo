// Facts about the site that structured data (and anything else outside a page) needs to agree on. Plain JS so the
// Node scripts and tests can import it without Astro.

export const SITE_URL = 'https://hunnydo.cloud';
export const SITE_NAME = 'HunnyDo';
export const LOGO_URL = `${SITE_URL}/logo.png`;
export const DEFAULT_OG_IMAGE = '/og-image.png';

// Where "contact us" links go. Pages never write these addresses out; they use a contact link (see contact.mjs).
export const SUPPORT_EMAIL = 'support@hunnydo.cloud';
export const LEGAL_EMAIL = 'privacy@hunnydo.cloud';

// "Contact us" links. A link carries `data-contact` attributes; the ContactModal opens on click, lets the visitor write
// a subject and message, and only then hands them to their mail client. Plain JS so the modal's script and the tests
// share one implementation.
import { LEGAL_EMAIL, SITE_NAME, SITE_URL, SUPPORT_EMAIL } from './site.mjs';

export const CONTACTS = {
  support: { email: SUPPORT_EMAIL, label: 'Support' },
  legal: { email: LEGAL_EMAIL, label: 'Legal' },
};

export const MESSAGE_SIGNATURE = `Sent from ${new URL(SITE_URL).hostname}`;

/** Attributes for an `<a>` (or `<Button>`) that opens the contact modal. The `mailto:` href is the no-JavaScript fallback. */
export function contactAttrs(kind, topic) {
  const attrs = { href: `mailto:${CONTACTS[kind].email}`, 'data-contact': kind };
  if (topic) attrs['data-contact-topic'] = topic;
  return attrs;
}

/** `HunnyDo Support - Page not found`: the subject the modal starts with. */
export function defaultSubject(kind, topic) {
  const prefix = `${SITE_NAME} ${CONTACTS[kind].label}`;
  return topic ? `${prefix} - ${topic}` : prefix;
}

/** A page title without the ` — HunnyDo` / `HunnyDo — ` branding, for use as a subject topic. */
export function topicFromTitle(title) {
  const topic = title
    .split(/\s+[—|-]\s+/)
    .filter((part) => part.trim() !== SITE_NAME)
    .join(' - ')
    .trim();
  return topic || title.trim();
}

/** The `mailto:` URL for what the visitor wrote, with the signature appended to their message. */
export function buildMailto({ to, subject, message }) {
  const body = `${message.trim()}\n\n${MESSAGE_SIGNATURE}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

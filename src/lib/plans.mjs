// The plans HunnyDo sells. This is the one place to change a plan's name, price, or features: the pricing cards on the
// home page (src/pages/index.astro), the Offers in the JSON-LD (src/lib/jsonld.mjs), and the Plans section of /llms.txt
// (src/lib/llms.mjs) are all built from it. Plain JS so the Node scripts and tests can import it without Astro.
//
// `price` is whole US dollars per month. `cta` and `featured` only affect the home page cards.

const APP_URL = 'https://app.hunnydo.cloud';

export const PLANS = [
  {
    name: 'Personal',
    price: 0,
    description: 'For the honey-do list and the group trip.',
    features: ['Unlimited checklists', 'Automatic reminders', 'Unlimited team members', 'Contact lists'],
    cta: { href: APP_URL, label: 'Start free', variant: 'ghost' },
  },
  {
    name: 'Professional',
    price: 5,
    priceValidUntil: '2027-12-31',
    description: 'For agents, brokers, and consultants.',
    features: [
      'Unlimited checklists',
      'Automatic reminders',
      'Unlimited team members',
      'Contact lists',
      'Project management',
      'Reusable templates',
      'Secure client links',
      'Secure file sharing',
    ],
    cta: { href: APP_URL, label: 'Subscribe', variant: 'primary' },
    featured: true,
  },
];

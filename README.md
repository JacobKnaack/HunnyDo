# HunnyDo — Marketing Site

The public marketing site for **HunnyDo**, a digital checklist tool that lets you assign tasks to other people — clients, coworkers, roommates, that one boyfriend — and automatically follows up until every item is checked off.

**Live site:** [hunnydo.cloud](https://hunnydo.cloud)
**App / sign up:** [app.hunnydo.cloud](https://app.hunnydo.cloud/signup)

## What's in this repo

An [Astro](https://astro.build) site — four pages (landing page, 404, brand kit, and the Fernwell design-language reference) built from a shared set of components instead of hand-copied HTML.

```txt
.
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro     # <head> boilerplate, fonts, SEO/OG/JSON-LD
│   ├── components/               # shared, reusable pieces (Nav, Footer, Button, Tag,
│   │                              # SectionHeading, Hero, FeatureCard, PriceCard, ...)
│   ├── styles/
│   │   ├── tokens.css            # design tokens (:root + [data-theme="dark"])
│   │   ├── components.css        # buttons, tags, nav, hero — site-wide
│   │   ├── modules.css           # marketing-page sections (cards, pricing, checklist preview)
│   │   ├── global.css            # imports the three above; pulled in by BaseLayout
│   │   ├── brand-kit.css         # page-specific styles for /brand-kit.html
│   │   └── fernwell.css          # page-specific styles for /fernwell.html
│   └── pages/
│       ├── index.astro           # landing page
│       ├── 404.astro
│       ├── brand-kit.astro
│       └── fernwell.astro
├── public/                       # static passthrough: CNAME, robots.txt, sitemap.xml, favicon
├── astro.config.mjs
└── .github/workflows/deploy.yml  # builds + deploys to GitHub Pages on push to main
```

## Page structure (index.astro)

- **Hero** — headline, primary CTA, and top-line stats (completion rate, checklists sent, avg. reminders to close a task)
- **Who it's for** — two audiences side by side: professionals (agencies, mortgage brokers, law firms, realtors) and everyday use (trip planning, roommates, honey-do lists)
- **Features** — build a checklist, automatic reminders, visibility into who's holding things up
- **Product preview** — a mocked-up checklist UI showing assignees, due dates, and status pills (Done / Waiting / Overdue)
- **Testimonial**
- **Pricing** — Personal (free) and Professional plans, linking out to the app's sign-up flow
- **Closing CTA + footer**

## Fernwell Design system

The site is built on the **Fernwell** token set (shared with the HunnyDo product UI), so the marketing site and the app stay visually consistent. `/fernwell.html` is the living reference for the full component language; `/brand-kit.html` covers the logo/identity system.

| Token | Value | Use |
| --- | --- | --- |
| `--marigold` | `#FFC145` | Primary brand / CTA — stays the same hex in light and dark mode |
| `--plum` | `#4C3A73` | Secondary brand, nav, headers |
| `--ink` / `--cloud` | `#1F2430` / `#F5F6F1` | Text and background neutrals |
| `--meadow` / `--coral` | `#3FA672` / `#E85B4F` | Success / overdue states |

- **Type:** Plus Jakarta Sans (display), Inter (body), IBM Plex Mono (data, stats, mono labels)
- **Shape:** a single rounding scale from `10px` (inputs) up to `999px` (pills/avatars) — the bigger the surface, the softer the corner
- **Dark mode:** toggled client-side via `[data-theme="dark"]` on `<body>`; all tokens are re-declared as CSS custom properties rather than inverted, so status colors brighten instead of just flipping

All tokens live in `src/styles/tokens.css` — every page pulls from the same file, so there's one source of truth instead of copy-pasted `:root` blocks.

## Running locally

```bash
npm install
npm run dev
# then visit http://localhost:4321
```

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

## Editing

- Section copy for the landing page is passed as props/slots from `src/pages/index.astro` into components in `src/components/` — edit the values there rather than the component markup.
- The product-preview checklist (`ProductPreview.astro`) takes a `rows` prop; edit the array in `index.astro` to change what's shown.
- `brand-kit.astro` and `fernwell.astro` are mostly one-off reference content (swatches, component demos) — edit them directly; only the repeated pieces (section headers, swatches, icon tiles) are pulled out as components.
- Pricing CTAs point to `https://app.hunnydo.cloud`; update those links if the sign-up flow moves.

## Deployment

Deployed to **GitHub Pages** via `.github/workflows/deploy.yml`, which builds with Astro and publishes on every push to `main`. The custom domain (`hunnydo.cloud`) is preserved via `public/CNAME`, which Astro copies into `dist/` on build.

## License

© HunnyDo. All rights reserved.

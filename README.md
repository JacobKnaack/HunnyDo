# HunnyDo — Marketing Site

The public marketing landing page for **HunnyDo**, a digital checklist tool that lets you assign tasks to other people — clients, coworkers, roommates, that one boyfriend — and automatically follows up until every item is checked off.

**Live site:** [hunnydo.cloud](https://hunnydo.cloud)
**App / sign up:** [app.hunnydo.cloud](https://app.hunnydo.cloud/signup)

## What's in this repo

A single static HTML page — no build step, no framework, no dependencies beyond Google Fonts. It's meant to be easy to deploy anywhere that serves static files.

```table
.
├── index.html      # the entire landing page (markup + CSS + JS inline)
└── README.md
```

## Page structure

- **Hero** — headline, primary CTA, and top-line stats (completion rate, checklists sent, avg. reminders to close a task)
- **Who it's for** — two audiences side by side: professionals (agencies, mortgage brokers, law firms, realtors) and everyday use (trip planning, roommates, honey-do lists)
- **Features** — build a checklist, automatic reminders, visibility into who's holding things up
- **Product preview** — a mocked-up checklist UI showing assignees, due dates, and status pills (Done / Waiting / Overdue)
- **Testimonial**
- **Pricing** — Personal (free) and Professional plans, linking out to the app's sign-up flow
- **Closing CTA + footer**

## Fernwell Design system

The page is built on the **Fernwell** token set (shared with the HunnyDo product UI), so the marketing site and the app stay visually consistent.

| Token | Value | Use |
|---|---|---|
| `--marigold` | `#FFC145` | Primary brand / CTA — stays the same hex in light and dark mode |
| `--plum` | `#4C3A73` | Secondary brand, nav, headers |
| `--ink` / `--cloud` | `#1F2430` / `#F5F6F1` | Text and background neutrals |
| `--meadow` / `--coral` | `#3FA672` / `#E85B4F` | Success / overdue states |

- **Type:** Plus Jakarta Sans (display), Inter (body), IBM Plex Mono (data, stats, mono labels)
- **Shape:** a single rounding scale from `10px` (inputs) up to `999px` (pills/avatars) — the bigger the surface, the softer the corner
- **Dark mode:** toggled client-side via `[data-theme="dark"]` on `<body>`; all tokens are re-declared as CSS custom properties rather than inverted, so status colors brighten instead of just flipping

All tokens live as CSS custom properties at the top of `index.html` — copy them directly if you need to build another page in the same system.

## Running locally

No build tooling required. Either open the file directly, or serve it so relative paths and fonts behave normally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Editing

- Copy (headlines, feature text, pricing) lives directly in the HTML — search for the relevant `<section>` by its `id` (`#usecases`, `#features`, `#product`, `#pricing`).
- The product-preview checklist is hand-authored markup, not a live embed — update the rows in `.checklist-rows` to change what's shown.
- Pricing CTAs point to `https://app.hunnydo.cloud/signup`; update those links if the sign-up flow moves.

## Deployment

Static file, so any static host works (Cloudflare Pages, Netlify, Vercel, S3 + CDN, etc.). Currently deployed at [hunnydo.cloud](https://hunnydo.cloud).

## License

© HunnyDo. All rights reserved.

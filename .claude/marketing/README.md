# HunnyDo marketing agents

## The team

| Agent | Does | Writes to |
|---|---|---|
| `market-researcher` | Competitors, personas, keywords, monthly scan | `marketing/research/` |
| `content-seo-writer` | Blog posts, vertical landing pages, lead-magnet checklists | `marketing/content/` |
| `social-community` | LinkedIn/X batches, Reddit/forum reply drafts, repurposing | `marketing/social/`, `marketing/community/` |
| `outbound-email` | Cold sequences, lifecycle/nurture flows | `marketing/outbound/`, `marketing/lifecycle/` |

All four read `marketing/CONTEXT.md` first. Edit that file to change positioning, voice or rules for every agent at once.

## Suggested first run (in this order)

1. `Use market-researcher to build competitors.md and personas.md for all four verticals`
2. `Use content-seo-writer to write a post targeting "documents needed for mortgage pre-approval"`
3. `Use social-community to repurpose that post and find 10 community threads this week`
4. `Use outbound-email to write a cold sequence for accountants at 2-15 person firms, ahead of tax season`

## Guardrails

The agents only write drafts. A person reviews and publishes or sends
everything. They won't invent testimonials or stats, and they follow each
community's self-promotion rules.

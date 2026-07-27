/**
 * Blog data-access module. This is the ONLY file that should import from
 * 'astro:content'. Pages and components consume the normalized `Post` /
 * `PostSummary` types below instead — if the source ever moves off local
 * markdown (headless CMS, remote API, ...), only this file needs to change.
 */
import { getCollection, getEntry, render } from 'astro:content';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { MarkdownHeading } from 'astro';

export type Category = 'guides' | 'product' | 'case' | 'freelance';

export const CATEGORY_META: Record<Category, { label: string; filterLabel: string; tagClass: string; accent: string }> = {
  guides: { label: 'Guides', filterLabel: 'Guides', tagClass: 'tag-guides', accent: 'var(--sky)' },
  product: { label: 'Product updates', filterLabel: 'Product updates', tagClass: 'tag-product', accent: 'var(--meadow)' },
  case: { label: 'Case study', filterLabel: 'Case studies', tagClass: 'tag-case', accent: 'var(--plum)' },
  freelance: { label: 'Freelancing', filterLabel: 'Freelancing', tagClass: 'tag-freelance', accent: 'var(--marigold-dk)' },
};

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  author: string;
  category: Category;
  featured: boolean;
  tags: string[];
  coverImage?: string;
  readingTimeMinutes: number;
}

export interface Post extends PostSummary {
  Content: AstroComponentFactory;
  headings: MarkdownHeading[];
}

function readingTimeFrom(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function toSummary(entry: Awaited<ReturnType<typeof getCollection<'blog'>>>[number]): PostSummary {
  return {
    slug: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    updated: entry.data.updated,
    author: entry.data.author,
    category: entry.data.category,
    featured: entry.data.featured,
    tags: entry.data.tags,
    coverImage: entry.data.coverImage,
    readingTimeMinutes: readingTimeFrom(entry.body),
  };
}

export async function getAllPosts(): Promise<PostSummary[]> {
  const entries = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.map(toSummary).sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const entry = await getEntry('blog', slug);
  if (!entry || (entry.data.draft && !import.meta.env.DEV)) return undefined;

  const { Content, headings } = await render(entry);
  return { ...toSummary(entry), Content, headings };
}

/** The post to lead with on the blog index: the explicitly `featured` one, or the newest. */
export function getFeaturedPost(posts: PostSummary[]): PostSummary | undefined {
  return posts.find((p) => p.featured) ?? posts[0];
}

/** Posts to surface under "Keep reading": same category first, newest fills the rest. */
export function getRelatedPosts(current: PostSummary, allPosts: PostSummary[], limit = 3): PostSummary[] {
  const others = allPosts.filter((p) => p.slug !== current.slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/** Deterministic 1-2 letter avatar initials from a display name. */
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Deterministic small integer seed from a slug, used for the procedural cover art. */
export function seedFromSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

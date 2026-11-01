import type { APIRoute } from 'astro';
import legal from '../legal.json';
import { getAllPosts } from '../lib/blog';
import { buildLlmsTxt } from '../lib/llms.mjs';

export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  return new Response(buildLlmsTxt({ posts, legal }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

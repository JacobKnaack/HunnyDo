import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://hunnydo.cloud',
  build: {
    format: 'file',
  },
  server: {
    // giscus.app fetches the custom theme CSS cross-origin; without this, astro dev/preview omit the CORS header and the browser blocks it.
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});

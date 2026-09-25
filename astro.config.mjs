import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://xn--wennstrm-t4a.fi',
  trailingSlash: 'always',
  integrations: [sitemap()],
});

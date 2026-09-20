import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Web to Markdown',
    description:
      'Extract web page content to clean markdown with YAML frontmatter',
    permissions: ['activeTab', 'scripting', 'downloads'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

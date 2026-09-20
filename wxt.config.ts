import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Web to Markdown',
    description:
      'Extract web page content to clean markdown with YAML frontmatter',
    permissions: [
      'activeTab',
      'scripting',
      'downloads',
      'storage',
      'notifications',
    ],
    commands: {
      'clip-to-markdown': {
        suggested_key: {
          default: 'Ctrl+Shift+M',
          mac: 'Command+Shift+M',
        },
        description: 'Clip current page to markdown',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

import { serializeFrontmatter } from './frontmatter';
import type { MarkdownFrontmatter } from './types';

export async function downloadMarkdown(
  markdown: string,
  frontmatter: MarkdownFrontmatter
): Promise<void> {
  const frontmatterStr = serializeFrontmatter(frontmatter);
  const content = frontmatterStr + markdown;
  const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await browser.downloads.download({
      url,
      filename: `${frontmatter.title || 'clipping'}.md`,
      saveAs: false,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

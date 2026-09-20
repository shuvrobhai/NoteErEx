import { serializeFrontmatter } from './frontmatter';
import type { MarkdownFrontmatter } from './types';

export function slugifyTitle(title: string, options?: { suffix?: string }): string {
  if (!title || typeof title !== 'string') {
    const suffix = options?.suffix ? `-${options.suffix}` : '';
    const base = suffix.replace(/^-/, '');
    return `${base || 'clipping'}.md`;
  }

  const suffix = options?.suffix ? `-${options.suffix}` : '';
  const base = title
    .toLowerCase()
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

  const sanitized = (base || 'clipping') + suffix;
  return sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
}

export function createMarkdownDataUrl(content: string): string {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
}

export async function downloadMarkdown(
  content: string,
  filename: string,
): Promise<number> {
  const sanitizedFilename = filename.endsWith('.md')
    ? filename
    : slugifyTitle(filename);
  const dataUrl = createMarkdownDataUrl(content);

  const downloadId = await browser.downloads.download({
    url: dataUrl,
    filename: sanitizedFilename,
    saveAs: false,
  });

  return downloadId;
}

export async function downloadMarkdownWithFrontmatter(
  markdown: string,
  frontmatter: MarkdownFrontmatter,
): Promise<number> {
  const frontmatterStr = serializeFrontmatter(frontmatter);
  const fullContent = frontmatterStr + markdown;
  const filename = slugifyTitle(frontmatter.title || 'clipping');
  return downloadMarkdown(fullContent, filename);
}

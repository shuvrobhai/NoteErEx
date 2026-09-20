import yaml from 'js-yaml';
import type { MarkdownFrontmatter } from './types';

export function getTitleFallback(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) return lastPart.replace(/\.[^.]+$/, '');
    }
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

export function normalizeDate(date: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function buildFrontmatter(
  title: string,
  source: string,
  options: {
    author?: string;
    published?: string;
    description?: string;
    wordCount?: number;
    enabledFields?: string[];
  } = {}
): MarkdownFrontmatter {
  const isEnabled = (field: string) =>
    !options.enabledFields || options.enabledFields.includes(field);

  const frontmatter: MarkdownFrontmatter = {
    title: title?.trim() || getTitleFallback(source),
    source,
    clipped_at: new Date().toISOString(),
  };

  if (isEnabled('author') && options.author && options.author.trim()) {
    frontmatter.author = options.author.trim();
  }

  if (isEnabled('published') && options.published) {
    const normalized = normalizeDate(options.published);
    if (normalized) frontmatter.published = normalized;
  }

  if (isEnabled('description') && options.description && options.description.trim()) {
    const trimmed = options.description.trim();
    frontmatter.description = trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
  }

  if (
    (isEnabled('word_count') || isEnabled('reading_time')) &&
    typeof options.wordCount === 'number' &&
    options.wordCount > 0
  ) {
    if (isEnabled('word_count')) {
      frontmatter.word_count = options.wordCount;
    }
    if (isEnabled('reading_time')) {
      frontmatter.reading_time = Math.max(1, Math.ceil(options.wordCount / 200));
    }
  }

  return frontmatter;
}

export function serializeFrontmatter(frontmatter: MarkdownFrontmatter): string {
  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: true,
  });
  return `---\n${yamlStr}---\n`;
}

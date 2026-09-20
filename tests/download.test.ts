import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';
import {
  slugifyTitle,
  createMarkdownDataUrl,
  downloadMarkdown,
  downloadMarkdownWithFrontmatter,
} from '../entrypoints/schema/download';

describe('Download Service (Feature 5, Milestone 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('slugifyTitle', () => {
    it('formats a normal article title into a clean kebab-case markdown filename', () => {
      const result = slugifyTitle('How to Build Chrome Extensions in 2026');
      expect(result).toBe('how-to-build-chrome-extensions-in-2026.md');
    });

    it('strips illegal filesystem characters', () => {
      const result = slugifyTitle(
        'What / Why : A * Guide ? For "Modern" <Web> | Devs',
      );
      expect(result).toBe('what-why-a-guide-for-modern-web-devs.md');
      expect(result).not.toMatch(/[/\\:*?"<>|]/);
    });

    it('collapses multiple spaces and hyphens', () => {
      const result = slugifyTitle('Multiple    Spaces   --- and --- dashes');
      expect(result).toBe('multiple-spaces-and-dashes.md');
    });

    it('falls back to clipping.md for empty or whitespace titles', () => {
      expect(slugifyTitle('')).toBe('clipping.md');
      expect(slugifyTitle('   ')).toBe('clipping.md');
      expect(slugifyTitle('///:::***???')).toBe('clipping.md');
    });

    it('enforces maximum 120 character limit for the title part', () => {
      const longTitle = 'a'.repeat(200);
      const result = slugifyTitle(longTitle);
      expect(result).toBe('a'.repeat(120) + '.md');
    });
  });

  describe('createMarkdownDataUrl', () => {
    it('creates a UTF-8 encoded data URL for markdown content', () => {
      const markdown =
        '# Hello World\n\nThis is **bold** text with emojis 🚀 & special chars: <>&"';
      const dataUrl = createMarkdownDataUrl(markdown);

      expect(dataUrl.startsWith('data:text/markdown;charset=utf-8,')).toBe(
        true,
      );
      const encoded = dataUrl.replace('data:text/markdown;charset=utf-8,', '');
      expect(decodeURIComponent(encoded)).toBe(markdown);
    });
  });

  describe('downloadMarkdown', () => {
    it('dispatches download with data URL and slugified filename', async () => {
      const downloadMock = vi.fn().mockResolvedValue(42);
      browser.downloads.download =
        downloadMock as unknown as typeof browser.downloads.download;

      const downloadId = await downloadMarkdown(
        '# Article Content',
        'my-cool-article.md',
      );

      expect(downloadId).toBe(42);
      expect(downloadMock).toHaveBeenCalledWith({
        url: 'data:text/markdown;charset=utf-8,%23%20Article%20Content',
        filename: 'my-cool-article.md',
        saveAs: false,
      });
    });

    it('works with downloadMarkdownWithFrontmatter convenience helper', async () => {
      const downloadMock = vi.fn().mockResolvedValue(99);
      browser.downloads.download =
        downloadMock as unknown as typeof browser.downloads.download;

      const downloadId = await downloadMarkdownWithFrontmatter(
        'Article body text',
        {
          title: 'Frontmatter Article',
          source: 'https://example.com/frontmatter',
          clipped_at: '2026-09-20T12:00:00.000Z',
        },
      );

      expect(downloadId).toBe(99);
      expect(downloadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'frontmatter-article.md',
          saveAs: false,
        }),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { browser } from 'wxt/browser';
import {
  isSupportedUrl,
  extractPreviewFromTab,
  extractFullArticleFromTab,
} from '../entrypoints/popup/services/extractor';
import {
  slugifyTitle,
  createMarkdownDataUrl,
  downloadMarkdown,
} from '../entrypoints/schema/download';
import { buildFrontmatter, serializeFrontmatter } from '../entrypoints/schema/frontmatter';
import { convertHtmlToMarkdown } from '../entrypoints/schema/conversion';
import { App } from '../entrypoints/popup/App';
import type { ExtractedArticle, ExtensionMessage, ExtensionResponse } from '../entrypoints/popup/types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Core Markdown Download Loop (Feature 5 End-to-End)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  describe('AC-6: URL Guards and Restricted URL Protection', () => {
    it('rejects unsupported browser internal and store URLs', () => {
      expect(isSupportedUrl('chrome://settings')).toBe(false);
      expect(isSupportedUrl('edge://extensions')).toBe(false);
      expect(isSupportedUrl('about:blank')).toBe(false);
      expect(isSupportedUrl('https://chromewebstore.google.com/detail/xyz')).toBe(false);
      expect(isSupportedUrl('https://chrome.google.com/webstore/category/extensions')).toBe(false);
    });

    it('accepts standard public http and https URLs', () => {
      expect(isSupportedUrl('https://developer.mozilla.org/en-US/docs/Web')).toBe(true);
      expect(isSupportedUrl('http://example.com/blog/article')).toBe(true);
    });

    it('throws friendly error on extractPreviewFromTab for restricted URL', async () => {
      const tab = { id: 1, url: 'chrome://extensions', title: 'Extensions' };
      await expect(extractPreviewFromTab(tab)).rejects.toThrow(
        'Clipping is not supported on internal browser pages or the Chrome Web Store.',
      );
    });

    it('throws friendly error on extractFullArticleFromTab for restricted URL', async () => {
      const tab = { id: 1, url: 'chrome://extensions', title: 'Extensions' };
      await expect(extractFullArticleFromTab(tab)).rejects.toThrow(
        'Clipping is not supported on internal browser pages or the Chrome Web Store.',
      );
    });
  });

  describe('AC-1: Active Tab Preview Extraction', () => {
    it('executes DOM preview function and produces structured metadata preview', async () => {
      const mockPreviewResult = {
        title: 'Deep Dive into Modern Web APIs',
        domain: 'web.dev',
        author: 'Web Dev Team',
        date: '2026-09-20',
        wordCount: 1500,
        readingTime: 8,
      };

      browser.scripting.executeScript = vi.fn().mockResolvedValue([
        { result: mockPreviewResult },
      ]) as unknown as typeof browser.scripting.executeScript;

      const preview = await extractPreviewFromTab({
        id: 10,
        url: 'https://web.dev/modern-apis',
        title: 'Deep Dive into Modern Web APIs - web.dev',
      });

      expect(preview.title).toBe('Deep Dive into Modern Web APIs');
      expect(preview.domain).toBe('web.dev');
      expect(preview.author).toBe('Web Dev Team');
      expect(preview.wordCount).toBe(1500);
      expect(preview.readingTime).toBe(8);
      expect(preview.presetName).toBe('Default');
    });
  });

  describe('AC-2, AC-3, AC-4: Article Extraction, Conversion, and Frontmatter', () => {
    it('executes readability runner and converts extracted HTML to GFM markdown with YAML frontmatter', async () => {
      const mockArticle: ExtractedArticle = {
        title: 'Understanding Manifest V3 Service Workers',
        byline: 'DevRel Team',
        excerpt: 'A comprehensive guide on browser extensions service workers.',
        content: '<h1>Header</h1><p>This is a paragraph with <strong>bold</strong> text and a <a href="https://example.com">link</a>.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
        textContent: 'Header\nThis is a paragraph with bold text and a link.\nItem 1\nItem 2',
        length: 45,
        siteName: 'Chrome Developers',
        url: 'https://developer.chrome.com/docs/extensions/mv3/intro',
      };

      browser.scripting.executeScript = vi.fn().mockResolvedValue([
        { result: mockArticle },
      ]) as unknown as typeof browser.scripting.executeScript;

      const extracted = await extractFullArticleFromTab({
        id: 42,
        url: 'https://developer.chrome.com/docs/extensions/mv3/intro',
        title: 'Understanding Manifest V3 Service Workers',
      });

      expect(extracted.title).toBe('Understanding Manifest V3 Service Workers');

      // Markdown conversion
      const markdown = convertHtmlToMarkdown(extracted.content);
      expect(markdown).toContain('Header');
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('[link](https://example.com)');
      expect(markdown).toContain('Item 1');
      expect(markdown).toContain('Item 2');

      // Frontmatter generation
      const frontmatter = buildFrontmatter(extracted.title, extracted.url, {
        author: extracted.byline,
        description: extracted.excerpt,
        wordCount: extracted.length,
      });

      const serialized = serializeFrontmatter(frontmatter);
      expect(serialized.startsWith('---\n')).toBe(true);
      expect(serialized).toContain('title: "Understanding Manifest V3 Service Workers"');
      expect(serialized).toContain('author: "DevRel Team"');
      expect(serialized).toContain('source: "https://developer.chrome.com/docs/extensions/mv3/intro"');
    });
  });

  describe('AC-5: Download Dispatch via Data URL and Background Service', () => {
    it('formats safe slug filename and dispatches data URL download', async () => {
      const downloadMock = vi.fn().mockResolvedValue(101);
      browser.downloads.download = downloadMock as unknown as typeof browser.downloads.download;

      const filename = slugifyTitle('Breaking News: New Features and "Updates" in 2026');
      expect(filename).toBe('breaking-news-new-features-and-updates-in-2026.md');

      const dataUrl = createMarkdownDataUrl('# Title\n\nContent');
      expect(dataUrl.startsWith('data:text/markdown;charset=utf-8,')).toBe(true);

      const downloadId = await downloadMarkdown('# Title\n\nContent', filename);
      expect(downloadId).toBe(101);
      expect(downloadMock).toHaveBeenCalledWith({
        url: 'data:text/markdown;charset=utf-8,%23%20Title%0A%0AContent',
        filename: 'breaking-news-new-features-and-updates-in-2026.md',
        saveAs: false,
      });
    });
  });

  describe('AC-1 to AC-6: Full Popup UI Pipeline Integration', () => {
    it('extracts preview on mount, clips full article on click, and saves file successfully', async () => {
      const mockTab = {
        id: 77,
        url: 'https://example.com/articles/react-patterns',
        title: 'Modern React Patterns in 2026',
      };

      browser.tabs.query = vi.fn().mockResolvedValue([mockTab]) as unknown as typeof browser.tabs.query;

      // Mock preview execution
      browser.scripting.executeScript = vi.fn().mockImplementation((options) => {
        if (options.func) {
          return Promise.resolve([
            {
              result: {
                title: 'Modern React Patterns in 2026',
                domain: 'example.com',
                author: 'Dan Developer',
                date: '2026-09-20',
                wordCount: 850,
                readingTime: 5,
              },
            },
          ]);
        }
        if (options.files) {
          return Promise.resolve([
            {
              result: {
                title: 'Modern React Patterns in 2026',
                byline: 'Dan Developer',
                excerpt: 'Deep dive into concurrent React rendering.',
                content: '<p>React 19 brings fine-grained reactivity.</p>',
                textContent: 'React 19 brings fine-grained reactivity.',
                length: 850,
                url: 'https://example.com/articles/react-patterns',
              },
            },
          ]);
        }
        return Promise.resolve([]);
      }) as unknown as typeof browser.scripting.executeScript;

      // Mock background download message response
      browser.runtime.sendMessage = vi.fn().mockImplementation((message: ExtensionMessage) => {
        if (message.type === 'DOWNLOAD_MARKDOWN') {
          const res: ExtensionResponse<{ downloadId: number }> = {
            success: true,
            data: { downloadId: 202 },
          };
          return Promise.resolve(res);
        }
        return Promise.resolve({ success: false, error: 'Unknown message' });
      }) as unknown as typeof browser.runtime.sendMessage;

      // Render popup app
      await act(async () => {
        root.render(<App />);
      });

      // Confirm preview rendered
      expect(container.textContent).toContain('Modern React Patterns in 2026');
      expect(container.textContent).toContain('example.com');
      expect(container.textContent).toContain('Dan Developer');
      expect(container.textContent).toContain('850 words');
      expect(container.textContent).toContain('5 min read');

      // Click download button
      const downloadBtn = container.querySelector('footer button') as HTMLButtonElement;
      await act(async () => {
        downloadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Verify success status feedback is rendered
      expect(container.textContent).toContain('Saved!');
      expect(container.textContent).toContain('modern-react-patterns-in-2026.md');
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOWNLOAD_MARKDOWN',
          filename: 'modern-react-patterns-in-2026.md',
          content: expect.stringContaining('title: "Modern React Patterns in 2026"'),
        }),
      );
    });

    it('shows error state when active tab has restricted URL', async () => {
      const mockTab = {
        id: 88,
        url: 'chrome://extensions',
        title: 'Chrome Extensions Management',
      };

      browser.tabs.query = vi.fn().mockResolvedValue([mockTab]) as unknown as typeof browser.tabs.query;

      await act(async () => {
        root.render(<App />);
      });

      // Error message should be rendered on mount due to unsupported URL
      expect(container.textContent).toContain('Failed:');
      expect(container.textContent).toContain(
        'Clipping is not supported on internal browser pages or the Chrome Web Store.',
      );
    });
  });
});

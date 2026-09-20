import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';
import { executeClip } from '../entrypoints/schema/clipPipeline';
import type { ActiveTab } from '../entrypoints/schema/types';

describe('ClipPipeline (AC-1, AC-2, AC-7 Deep Pipeline Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidTab: ActiveTab = {
    id: 101,
    url: 'https://example.com/deep-dive',
    title: 'Deep Architecture Dive',
    active: true,
  };

  it('rejects unsupported URLs fast', async () => {
    const restrictedTab: ActiveTab = {
      id: 99,
      url: 'chrome://settings',
      title: 'Settings',
      active: true,
    };

    await expect(executeClip({ tab: restrictedTab })).rejects.toThrow(
      'Clipping is not supported on internal browser pages or the Chrome Web Store.',
    );
  });

  it('executes full article clipping when no text selection is present', async () => {
    // Selection returns empty
    browser.scripting.executeScript = vi.fn().mockImplementation((opts) => {
      if (opts.func) {
        // extractDomSelection
        return Promise.resolve([
          {
            result: {
              hasSelection: false,
              text: '',
              html: '',
              wordCount: 0,
            },
          },
        ]);
      }
      if (opts.files) {
        // readability runner
        return Promise.resolve([
          {
            result: {
              title: 'Extracted Article Title',
              byline: 'Expert Author',
              excerpt: 'An excerpt of the article',
              content: '<h2>Section Header</h2><p>Article body content.</p>',
              textContent: 'Section Header\nArticle body content.',
              length: 120,
              url: 'https://example.com/deep-dive',
            },
          },
        ]);
      }
      return Promise.resolve([]);
    }) as unknown as typeof browser.scripting.executeScript;

    const downloadMock = vi.fn().mockResolvedValue(555);
    browser.downloads.download =
      downloadMock as unknown as typeof browser.downloads.download;

    const result = await executeClip({
      tab: mockValidTab,
      downloadLocally: true,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('article');
    expect(result.title).toBe('Extracted Article Title');
    expect(result.filename).toBe('extracted-article-title.md');
    expect(result.markdown).toContain('type: "article"');
    expect(result.markdown).toContain('Section Header');
    expect(result.markdown).toContain('Article body content.');
    expect(result.downloadId).toBe(555);
  });

  it('executes highlight clipping when text selection is present', async () => {
    browser.scripting.executeScript = vi.fn().mockImplementation((opts) => {
      if (opts.func) {
        return Promise.resolve([
          {
            result: {
              hasSelection: true,
              text: 'Important selected quote',
              html: '<p>Important <strong>selected quote</strong></p>',
              wordCount: 3,
            },
          },
        ]);
      }
      return Promise.resolve([]);
    }) as unknown as typeof browser.scripting.executeScript;

    const downloadMock = vi.fn().mockResolvedValue(777);
    browser.downloads.download =
      downloadMock as unknown as typeof browser.downloads.download;

    const result = await executeClip({
      tab: mockValidTab,
      preferredAuthor: 'Custom Author',
      downloadLocally: true,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('selection');
    expect(result.filename).toBe('deep-architecture-dive-highlight.md');
    expect(result.markdown).toContain('type: "highlight"');
    expect(result.markdown).toContain('author: "Custom Author"');
    expect(result.markdown).toContain('Important **selected quote**');
    expect(result.downloadId).toBe(777);
  });

  it('falls back to article extraction when selection is only whitespace', async () => {
    browser.scripting.executeScript = vi.fn().mockImplementation((opts) => {
      if (opts.func) {
        return Promise.resolve([
          {
            result: {
              hasSelection: true,
              text: '   ',
              html: '   ',
              wordCount: 0,
            },
          },
        ]);
      }
      if (opts.files) {
        return Promise.resolve([
          {
            result: {
              title: 'Fallback Article',
              byline: 'Author',
              content: '<p>Fallback text</p>',
              textContent: 'Fallback text',
              length: 50,
              url: 'https://example.com/deep-dive',
            },
          },
        ]);
      }
      return Promise.resolve([]);
    }) as unknown as typeof browser.scripting.executeScript;

    const downloadMock = vi.fn().mockResolvedValue(888);
    browser.downloads.download =
      downloadMock as unknown as typeof browser.downloads.download;

    const result = await executeClip({ tab: mockValidTab });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('article');
    expect(result.filename).toBe('fallback-article.md');
  });

  it('skips local download when downloadLocally is false', async () => {
    browser.scripting.executeScript = vi.fn().mockImplementation((opts) => {
      if (opts.files) {
        return Promise.resolve([
          {
            result: {
              title: 'No Download Article',
              content: '<p>Content</p>',
              textContent: 'Content',
              length: 10,
              url: 'https://example.com/deep-dive',
            },
          },
        ]);
      }
      return Promise.resolve([{ result: { hasSelection: false } }]);
    }) as unknown as typeof browser.scripting.executeScript;

    const downloadMock = vi.fn();
    browser.downloads.download =
      downloadMock as unknown as typeof browser.downloads.download;

    const result = await executeClip({
      tab: mockValidTab,
      downloadLocally: false,
    });

    expect(result.success).toBe(true);
    expect(result.downloadId).toBeUndefined();
    expect(downloadMock).not.toHaveBeenCalled();
  });
});

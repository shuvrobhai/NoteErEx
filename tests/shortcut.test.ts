import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';
import { handleCommandClip } from '../entrypoints/background';
import type {
  ActiveTab,
  ExtractedArticle,
  ActiveTabSelection,
} from '../entrypoints/schema/types';

describe('Keyboard Shortcut Trigger (Feature 7, Slice 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCommandClip', () => {
    it('throws when active tab cannot be found', async () => {
      browser.tabs.query = vi.fn().mockResolvedValue([]);

      await expect(handleCommandClip()).rejects.toThrow(
        'No active browser tab found.',
      );
    });

    it('rejects restricted URLs before script injection (AC-6)', async () => {
      const tab: ActiveTab = {
        id: 101,
        url: 'chrome://settings',
        title: 'Settings',
      };

      await expect(handleCommandClip(tab)).rejects.toThrow(
        'Clipping is not supported on internal browser pages or the Chrome Web Store.',
      );
    });

    it('clips full article when no selection exists (AC-2, AC-4)', async () => {
      const tab: ActiveTab = {
        id: 102,
        url: 'https://example.com/blog/great-article',
        title: 'Great Article',
      };

      const mockSelectionResult: ActiveTabSelection = {
        hasSelection: false,
        text: '',
        html: '',
        wordCount: 0,
      };

      const mockArticleResult: ExtractedArticle = {
        title: 'Great Article',
        byline: 'Jane Author',
        content:
          '<p>This is a <strong>great</strong> article about web development.</p>',
        textContent: 'This is a great article about web development.',
        length: 46,
        url: 'https://example.com/blog/great-article',
      };

      const executeScriptMock = vi
        .fn()
        // First call: check selection
        .mockResolvedValueOnce([{ result: mockSelectionResult }])
        // Second call: readability runner
        .mockResolvedValueOnce([{ result: mockArticleResult }]);

      browser.scripting.executeScript =
        executeScriptMock as unknown as typeof browser.scripting.executeScript;

      const downloadMock = vi.fn().mockResolvedValue(12345);
      browser.downloads.download =
        downloadMock as unknown as typeof browser.downloads.download;

      const result = await handleCommandClip(tab);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('great-article.md');
      expect(result.downloadId).toBe(12345);

      expect(downloadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'great-article.md',
          saveAs: false,
        }),
      );

      const downloadedUrl = downloadMock.mock.calls[0]?.[0]?.url ?? '';
      const decodedContent = decodeURIComponent(downloadedUrl);
      expect(decodedContent).toContain('type: "article"');
      expect(decodedContent).toContain('author: "Jane Author"');
      expect(decodedContent).toContain(
        'This is a **great** article about web development.',
      );
    });

    it('clips selection with type: highlight when text is highlighted (AC-3, AC-4)', async () => {
      const tab: ActiveTab = {
        id: 103,
        url: 'https://example.com/research/paper',
        title: 'Research Paper',
      };

      const mockSelectionResult: ActiveTabSelection = {
        hasSelection: true,
        text: 'Crucial passage of research text',
        html: '<p>Crucial <em>passage</em> of research text</p>',
        wordCount: 5,
      };

      const executeScriptMock = vi
        .fn()
        .mockResolvedValueOnce([{ result: mockSelectionResult }]);

      browser.scripting.executeScript =
        executeScriptMock as unknown as typeof browser.scripting.executeScript;

      const downloadMock = vi.fn().mockResolvedValue(67890);
      browser.downloads.download =
        downloadMock as unknown as typeof browser.downloads.download;

      const result = await handleCommandClip(tab);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('research-paper-highlight.md');
      expect(result.downloadId).toBe(67890);

      expect(downloadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'research-paper-highlight.md',
          saveAs: false,
        }),
      );

      const downloadedUrl = downloadMock.mock.calls[0]?.[0]?.url ?? '';
      const decodedContent = decodeURIComponent(downloadedUrl);
      expect(decodedContent).toContain('type: "highlight"');
      expect(decodedContent).toContain('Crucial _passage_ of research text');
    });

    it('falls back to full article clipping if selection extraction throws (AC-3, AC-7)', async () => {
      const tab: ActiveTab = {
        id: 104,
        url: 'https://example.com/doc',
        title: 'Documentation',
      };

      const mockArticleResult: ExtractedArticle = {
        title: 'Documentation',
        content: '<p>Fallback full article documentation text.</p>',
        textContent: 'Fallback full article documentation text.',
        length: 42,
        url: 'https://example.com/doc',
      };

      const executeScriptMock = vi
        .fn()
        // Selection extraction throws (e.g. cross-origin frame error)
        .mockRejectedValueOnce(new Error('Cross-origin frame'))
        // Readability succeeds
        .mockResolvedValueOnce([{ result: mockArticleResult }]);

      browser.scripting.executeScript =
        executeScriptMock as unknown as typeof browser.scripting.executeScript;

      const downloadMock = vi.fn().mockResolvedValue(111);
      browser.downloads.download =
        downloadMock as unknown as typeof browser.downloads.download;

      const result = await handleCommandClip(tab);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('documentation.md');
      expect(downloadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'documentation.md',
        }),
      );
    });
  });
});

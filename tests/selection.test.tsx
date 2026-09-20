import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  extractDomSelection,
  extractSelectionFromTab,
  isSupportedUrl,
} from '../entrypoints/popup/services/extractor';
import {
  buildFrontmatter,
  serializeFrontmatter,
} from '../entrypoints/schema/frontmatter';
import { slugifyTitle } from '../entrypoints/schema/download';
import { PagePreviewCard } from '../entrypoints/popup/components/PagePreviewCard';
import type { PageMetadataPreview } from '../entrypoints/popup/types';

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Selected Text Clipping (Feature 6)', () => {
  describe('isSupportedUrl', () => {
    it('rejects restricted schemes for selection extraction', () => {
      expect(isSupportedUrl('chrome://extensions')).toBe(false);
      expect(isSupportedUrl('chrome://settings')).toBe(false);
      expect(isSupportedUrl('edge://settings')).toBe(false);
      expect(isSupportedUrl('about:blank')).toBe(false);
      expect(isSupportedUrl('chrome-extension://abc123/popup.html')).toBe(
        false,
      );
      expect(isSupportedUrl('devtools://devtools/bundled/inspector.html')).toBe(
        false,
      );
      expect(isSupportedUrl('view-source:https://example.com')).toBe(false);
    });

    it('allows standard web URLs', () => {
      expect(isSupportedUrl('https://example.com/article')).toBe(true);
      expect(isSupportedUrl('http://example.com/article')).toBe(true);
    });
  });

  describe('extractDomSelection', () => {
    const originalGetSelection = window.getSelection;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      window.getSelection = originalGetSelection;
    });

    it('returns hasSelection false when no text is selected', () => {
      window.getSelection = vi.fn().mockReturnValue({
        toString: () => '',
      }) as unknown as typeof window.getSelection;

      const result = extractDomSelection();
      expect(result.hasSelection).toBe(false);
      expect(result.text).toBe('');
      expect(result.html).toBe('');
      expect(result.wordCount).toBe(0);
    });

    it('returns hasSelection true with text, html, and word count', () => {
      const mockRange = {
        cloneContents: () => {
          const div = document.createElement('div');
          div.innerHTML = '<p>Hello <b>world</b></p>';
          return div;
        },
      };

      window.getSelection = vi.fn().mockReturnValue({
        toString: () => 'Hello world',
        getRangeAt: () => mockRange,
      }) as unknown as typeof window.getSelection;

      const result = extractDomSelection();
      expect(result.hasSelection).toBe(true);
      expect(result.text).toBe('Hello world');
      expect(result.wordCount).toBe(2);
      expect(result.html).toContain('<p>');
      expect(result.html).toContain('<b>');
    });

    it('strips script, style, iframe, and object tags', () => {
      const mockRange = {
        cloneContents: () => {
          const div = document.createElement('div');
          div.innerHTML =
            '<p>Safe</p><script>alert(1)</script><style>.x{}</style><iframe src="x"></iframe><object data="y"></object>';
          return div;
        },
      };

      window.getSelection = vi.fn().mockReturnValue({
        toString: () => 'Safe',
        getRangeAt: () => mockRange,
      }) as unknown as typeof window.getSelection;

      const result = extractDomSelection();
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('<style>');
      expect(result.html).not.toContain('<iframe');
      expect(result.html).not.toContain('<object');
      expect(result.html).toContain('<p>Safe</p>');
    });

    it('strips inline event handler attributes', () => {
      const mockRange = {
        cloneContents: () => {
          const div = document.createElement('div');
          div.innerHTML =
            '<p onclick="alert(1)">Safe</p><span onmouseover="x">hover</span>';
          return div;
        },
      };

      window.getSelection = vi.fn().mockReturnValue({
        toString: () => 'Safe hover',
        getRangeAt: () => mockRange,
      }) as unknown as typeof window.getSelection;

      const result = extractDomSelection();
      expect(result.html).not.toContain('onclick');
      expect(result.html).not.toContain('onmouseover');
    });

    it('clamps selection text and html at 50,000 characters', () => {
      const longText = 'a'.repeat(60000);
      const mockRange = {
        cloneContents: () => {
          const div = document.createElement('div');
          div.innerHTML = `<p>${longText}</p>`;
          return div;
        },
      };

      window.getSelection = vi.fn().mockReturnValue({
        toString: () => longText,
        getRangeAt: () => mockRange,
      }) as unknown as typeof window.getSelection;

      const result = extractDomSelection();
      expect(result.text.length).toBeLessThanOrEqual(50000);
      expect(result.html.length).toBeLessThanOrEqual(50000);
    });
  });

  describe('extractSelectionFromTab', () => {
    it('throws on restricted URLs', async () => {
      const tab = { id: 1, url: 'chrome://extensions' };
      await expect(extractSelectionFromTab(tab)).rejects.toThrow(
        'Clipping is not supported on internal browser pages or the Chrome Web Store.',
      );
    });

    it('throws when tab id is missing', async () => {
      const tab = { url: 'https://example.com' };
      await expect(extractSelectionFromTab(tab)).rejects.toThrow(
        'Active browser tab ID is missing.',
      );
    });
  });

  describe('buildFrontmatter with type highlight', () => {
    it('generates frontmatter with required type highlight', () => {
      const frontmatter = buildFrontmatter(
        'Test title',
        'https://example.com',
        {
          author: 'Author',
          wordCount: 100,
          type: 'highlight',
        },
      );

      expect(frontmatter.title).toBe('Test title');
      expect(frontmatter.source).toBe('https://example.com');
      expect(frontmatter.author).toBe('Author');
      expect(frontmatter.word_count).toBe(100);
      expect(frontmatter.reading_time).toBe(1);
      expect(frontmatter.type).toBe('highlight');
    });

    it('serializes highlight frontmatter with type field', () => {
      const frontmatter = buildFrontmatter('Quote', 'https://example.com', {
        wordCount: 50,
        type: 'highlight',
      });

      const serialized = serializeFrontmatter(frontmatter);
      expect(serialized).toContain('type: "highlight"');
      expect(serialized).toContain('title: "Quote"');
      expect(serialized).toContain('source: "https://example.com"');
    });
  });

  describe('slugifyTitle with highlight suffix', () => {
    it('generates {slug}-highlight.md filename', () => {
      expect(slugifyTitle('My Article', { suffix: 'highlight' })).toBe(
        'my-article-highlight.md',
      );
    });

    it('falls back to suffix.md for empty title', () => {
      expect(slugifyTitle('', { suffix: 'highlight' })).toBe('highlight.md');
    });
  });

  describe('PagePreviewCard selection mode', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
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

    it('renders selection chip and snippet when selection is active', async () => {
      const metadata: PageMetadataPreview = {
        title: 'Article title',
        domain: 'example.com',
        author: 'Author',
        date: '2026-09-20',
        wordCount: 500,
        readingTime: 3,
        presetName: 'Default',
      };

      await act(async () => {
        root.render(
          <PagePreviewCard
            metadata={metadata}
            selection={{
              hasSelection: true,
              wordCount: 42,
              snippet: 'Selected text snippet...',
            }}
          />,
        );
      });

      expect(container.textContent).toContain('Selection preview');
      expect(container.textContent).toContain('Selection');
      expect(container.textContent).toContain('42');
      expect(container.textContent).toContain('Selected text snippet...');
    });

    it('renders page preview when no selection', async () => {
      const metadata: PageMetadataPreview = {
        title: 'Article title',
        domain: 'example.com',
        presetName: 'Default',
      };

      await act(async () => {
        root.render(<PagePreviewCard metadata={metadata} />);
      });

      expect(container.textContent).toContain('Page preview');
      expect(container.textContent).not.toContain('Selection');
    });
  });
});

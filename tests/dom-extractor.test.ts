import { describe, it, expect } from 'vitest';
import {
  isSupportedUrl,
  extractDomPreview,
  extractDomSelection,
  sanitizeNode,
  countWords,
  UNSUPPORTED_SCHEMES,
  MAX_SELECTION_CHARS,
} from '../entrypoints/schema/domExtractor';

describe('DomExtractor (AC-3, AC-6 Pure DOM Testing)', () => {
  describe('Constants and isSupportedUrl', () => {
    it('declares expected unsupported schemes', () => {
      expect(UNSUPPORTED_SCHEMES).toContain('chrome://');
      expect(UNSUPPORTED_SCHEMES).toContain('edge://');
      expect(UNSUPPORTED_SCHEMES).toContain('about:');
      expect(MAX_SELECTION_CHARS).toBe(50000);
    });

    it('validates supported and unsupported URLs', () => {
      expect(isSupportedUrl('https://example.com/article')).toBe(true);
      expect(isSupportedUrl('http://blog.test/post')).toBe(true);
      expect(isSupportedUrl('chrome://settings')).toBe(false);
      expect(isSupportedUrl('edge://history')).toBe(false);
      expect(isSupportedUrl('about:blank')).toBe(false);
      expect(
        isSupportedUrl('https://chromewebstore.google.com/detail/123'),
      ).toBe(false);
      expect(isSupportedUrl('')).toBe(false);
      expect(isSupportedUrl(undefined)).toBe(false);
    });
  });

  describe('countWords', () => {
    it('counts words in english text accurately', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  One   two   three  ')).toBe(3);
      expect(countWords('')).toBe(0);
    });
  });

  describe('sanitizeNode', () => {
    it('removes unsafe tags and on* attributes from DOM nodes', () => {
      const doc = document.implementation.createHTMLDocument('Sanitize Test');
      const container = doc.createElement('div');
      container.innerHTML = `
        <p onclick="alert('pwned')">Safe text</p>
        <script>alert(1)</script>
        <iframe src="https://evil.com"></iframe>
        <style>body { color: red; }</style>
        <object data="test"></object>
        <a href="https://example.com" onmouseover="malicious()">Link</a>
      `;

      sanitizeNode(container, doc);

      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();
      expect(container.querySelector('style')).toBeNull();
      expect(container.querySelector('object')).toBeNull();
      expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
      expect(
        container.querySelector('a')?.getAttribute('onmouseover'),
      ).toBeNull();
      expect(container.textContent).toContain('Safe text');
      expect(container.textContent).toContain('Link');
    });
  });

  describe('extractDomPreview', () => {
    it('extracts metadata from isolated Document fixture with zero browser mocks', () => {
      const doc = document.implementation.createHTMLDocument('Article Title');
      doc.title = 'Fallback Document Title';

      const ogTitle = doc.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', 'OG Article Headline');
      doc.head.appendChild(ogTitle);

      const authorMeta = doc.createElement('meta');
      authorMeta.setAttribute('name', 'author');
      authorMeta.setAttribute('content', 'Jane Doe');
      doc.head.appendChild(authorMeta);

      const dateMeta = doc.createElement('meta');
      dateMeta.setAttribute('property', 'article:published_time');
      dateMeta.setAttribute('content', '2026-09-21T00:00:00Z');
      doc.head.appendChild(dateMeta);

      const p = doc.createElement('p');
      p.textContent = new Array(250).fill('example').join(' ');
      doc.body.appendChild(p);

      const preview = extractDomPreview(
        doc,
        'Default Title',
        'https://example.com/test',
      );

      expect(preview.title).toBe('OG Article Headline');
      expect(preview.author).toBe('Jane Doe');
      expect(preview.date).toBe('2026-09-21T00:00:00Z');
      expect(preview.wordCount).toBe(250);
      expect(preview.readingTime).toBe(2);
      expect(preview.domain).toBe('example.com');
    });

    it('handles document with no metadata gracefully', () => {
      const doc = document.implementation.createHTMLDocument('');
      doc.body.innerHTML = '<p>Simple paragraph.</p>';

      const preview = extractDomPreview(
        doc,
        'Fallback Title',
        'https://myblog.org/p',
      );

      expect(preview.title).toBe('Fallback Title');
      expect(preview.domain).toBe('myblog.org');
      expect(preview.wordCount).toBe(2);
      expect(preview.readingTime).toBe(1);
      expect(preview.author).toBeUndefined();
    });
  });

  describe('extractDomSelection', () => {
    it('extracts selection contents from Window object', () => {
      const doc = document.implementation.createHTMLDocument('Selection Test');
      const p = doc.createElement('p');
      p.innerHTML = 'Selected <b>bold passage</b> here';
      doc.body.appendChild(p);

      const mockWindow = {
        document: doc,
        getSelection: () => ({
          toString: () => 'Selected bold passage here',
          rangeCount: 1,
          getRangeAt: () => {
            const range = doc.createRange();
            range.selectNodeContents(p);
            return range;
          },
        }),
      } as unknown as Window;

      const selection = extractDomSelection(mockWindow);

      expect(selection.hasSelection).toBe(true);
      expect(selection.text).toBe('Selected bold passage here');
      expect(selection.html).toContain('Selected');
      expect(selection.html).toContain('<b>bold passage</b>');
      expect(selection.wordCount).toBe(4);
    });

    it('returns hasSelection false when selection is empty', () => {
      const mockWindow = {
        document,
        getSelection: () => ({
          toString: () => '   ',
          rangeCount: 0,
          getRangeAt: () => null,
        }),
      } as unknown as Window;

      const selection = extractDomSelection(mockWindow);
      expect(selection.hasSelection).toBe(false);
      expect(selection.text).toBe('');
      expect(selection.html).toBe('');
    });
  });
});

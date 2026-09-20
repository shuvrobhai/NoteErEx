import { describe, it, expect } from 'vitest';
import {
  isSupportedUrl,
  extractDomPreview,
} from '../entrypoints/popup/services/extractor';
import { extractArticleWithReadability } from '../entrypoints/readability-runner';

describe('Extractor Service (Feature 5, Milestone 1)', () => {
  describe('isSupportedUrl', () => {
    it('allows standard https and http web URLs', () => {
      expect(
        isSupportedUrl('https://developer.chrome.com/docs/extensions'),
      ).toBe(true);
      expect(isSupportedUrl('http://example.com/blog/my-post')).toBe(true);
    });

    it('rejects invalid or empty URLs', () => {
      expect(isSupportedUrl('')).toBe(false);
      expect(isSupportedUrl(undefined)).toBe(false);
      expect(isSupportedUrl('not-a-valid-url')).toBe(false);
    });

    it('rejects browser internal schemes', () => {
      expect(isSupportedUrl('chrome://extensions')).toBe(false);
      expect(isSupportedUrl('chrome://settings')).toBe(false);
      expect(isSupportedUrl('edge://settings')).toBe(false);
      expect(isSupportedUrl('about:blank')).toBe(false);
      expect(isSupportedUrl('chrome-extension://abc123xyz/popup.html')).toBe(
        false,
      );
      expect(isSupportedUrl('devtools://devtools/bundled/inspector.html')).toBe(
        false,
      );
      expect(isSupportedUrl('view-source:https://example.com')).toBe(false);
    });

    it('rejects Chrome Web Store URLs', () => {
      expect(
        isSupportedUrl(
          'https://chromewebstore.google.com/detail/my-extension/123',
        ),
      ).toBe(false);
      expect(
        isSupportedUrl(
          'https://chrome.google.com/webstore/detail/my-extension/123',
        ),
      ).toBe(false);
    });
  });

  describe('extractDomPreview', () => {
    it('extracts metadata, word count, and reading time from DOM', () => {
      document.title = 'Fallback Page Title';

      const ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', 'OpenGraph Great Article Title');
      document.head.appendChild(ogTitle);

      const authorMeta = document.createElement('meta');
      authorMeta.setAttribute('name', 'author');
      authorMeta.setAttribute('content', 'Alice Johnson');
      document.head.appendChild(authorMeta);

      const dateMeta = document.createElement('meta');
      dateMeta.setAttribute('property', 'article:published_time');
      dateMeta.setAttribute('content', '2026-09-20');
      document.head.appendChild(dateMeta);

      const paragraph = document.createElement('p');
      // Create ~400 words to test word count and reading time
      paragraph.textContent = new Array(400).fill('word').join(' ');
      document.body.appendChild(paragraph);

      const preview = extractDomPreview();

      expect(preview.title).toBe('OpenGraph Great Article Title');
      expect(preview.author).toBe('Alice Johnson');
      expect(preview.date).toBe('2026-09-20');
      expect(preview.wordCount).toBe(400);
      expect(preview.readingTime).toBe(2); // 400 / 200 = 2 min

      // Clean up DOM
      ogTitle.remove();
      authorMeta.remove();
      dateMeta.remove();
      paragraph.remove();
    });
  });

  describe('extractArticleWithReadability', () => {
    it('extracts article title, content, byline, and excerpt with Readability', () => {
      const doc = document.implementation.createHTMLDocument('Sample Doc');
      doc.body.innerHTML = `
        <article>
          <h1>How to Build Great Tools</h1>
          <p class="byline">By Sarah Connor</p>
          <p>Building great software requires deep focus, disciplined practices, and strong architectural foundations.</p>
          <p>Second paragraph providing in-depth technical discussion about browser extensions, content scripts, and Manifest V3 boundaries.</p>
        </article>
      `;

      const result = extractArticleWithReadability(
        doc,
        'https://example.com/great-tools',
      );

      expect(result.title).toBe('How to Build Great Tools');
      expect(result.url).toBe('https://example.com/great-tools');
      expect(result.content).toContain('Building great software');
      expect(result.textContent).toContain('Building great software');
      expect(result.length).toBeGreaterThan(50);
    });

    it('falls back gracefully on empty or unstructured pages', () => {
      const doc = document.implementation.createHTMLDocument();
      doc.title = 'Minimal Page';
      doc.body.innerHTML = '<div>Just a small snippet.</div>';

      const result = extractArticleWithReadability(
        doc,
        'https://example.com/minimal',
      );

      expect(result.title).toBe('Minimal Page');
      expect(result.url).toBe('https://example.com/minimal');
      expect(result.content).toContain('Just a small snippet.');
    });
  });
});

import { browser } from 'wxt/browser';
import type {
  ActiveTab,
  ActiveTabSelection,
  ExtractedArticle,
  ExtractedSelectionPayload,
} from './types';
import { matchPreset } from './presets';
import { DEFAULT_PRESET } from './constants';

export interface PageMetadataPreview {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount?: number;
  readingTime?: number;
  presetName: string;
}

export const UNSUPPORTED_SCHEMES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'moz-extension://',
  'devtools://',
  'view-source:',
];

export const MAX_SELECTION_CHARS = 50000;

export function isSupportedUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim().toLowerCase();

  for (const scheme of UNSUPPORTED_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      return false;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.hostname === 'chromewebstore.google.com' ||
      (parsed.hostname === 'chrome.google.com' &&
        parsed.pathname.startsWith('/webstore'))
    ) {
      return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomPreview(): {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount: number;
  readingTime: number;
} {
  const doc = document;
  const title =
    doc
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content')
      ?.trim() ||
    doc.title?.trim() ||
    window.location.hostname;

  const domain = window.location.hostname;

  const author =
    doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
    doc
      .querySelector('meta[property="article:author"]')
      ?.getAttribute('content')
      ?.trim() ||
    doc.querySelector('[rel="author"]')?.textContent?.trim() ||
    undefined;

  const date =
    doc
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute('content')
      ?.trim() ||
    doc.querySelector('meta[name="date"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('time')?.getAttribute('datetime')?.trim() ||
    doc.querySelector('time')?.textContent?.trim() ||
    undefined;

  const bodyText = doc.body
    ? doc.body.innerText || doc.body.textContent || ''
    : '';
  const words = bodyText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title,
    domain,
    author: author || undefined,
    date: date || undefined,
    wordCount,
    readingTime,
  };
}

export function extractDomSelection(): ActiveTabSelection {
  const selection = window.getSelection();
  if (!selection) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  const selectedText = selection.toString().trim();

  if (!selectedText) {
    return {
      hasSelection: false,
      text: '',
      html: '',
      wordCount: 0,
    };
  }

  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const container = document.createElement('div');
  container.appendChild(fragment);

  sanitizeNode(container);

  let html = container.innerHTML;
  if (html.length > MAX_SELECTION_CHARS) {
    html = html.slice(0, MAX_SELECTION_CHARS);
  }

  const text = selectedText.slice(0, MAX_SELECTION_CHARS);
  const wordCount = countWords(text);

  return {
    hasSelection: true,
    text,
    html,
    wordCount,
  };
}

function sanitizeNode(node: Node): void {
  const unsafeTags = new Set([
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'LINK',
  ]);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  let current: Element | null = walker.currentNode as Element;
  while (current) {
    if (unsafeTags.has(current.tagName)) {
      toRemove.push(current);
    } else {
      const attrs = current.attributes;
      for (let i = attrs.length - 1; i >= 0; i--) {
        const attr = attrs[i];
        if (attr && attr.name.startsWith('on')) {
          current.removeAttribute(attr.name);
        }
      }
    }
    current = walker.nextNode() as Element | null;
  }

  for (const el of toRemove) {
    el.remove();
  }
}

function countWords(text: string): number {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
    let count = 0;
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) {
        count++;
      }
    }
    return count;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function getActiveTab(): Promise<ActiveTab | null> {
  if (typeof browser === 'undefined' || !browser.tabs?.query) {
    return null;
  }
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tab = tabs[0];
  if (!tab) {
    return null;
  }
  return {
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    active: tab.active,
  };
}

export async function extractPreviewFromTab(
  tab: ActiveTab,
): Promise<PageMetadataPreview> {
  const tabUrl = tab.url || '';
  if (!isSupportedUrl(tabUrl)) {
    throw new Error(
      'Clipping is not supported on internal browser pages or the Chrome Web Store.',
    );
  }

  if (!tab.id) {
    throw new Error('Active browser tab ID is missing.');
  }

  const preset = matchPreset(tabUrl, {}, DEFAULT_PRESET);
  const presetName = preset ? preset.name : 'Default';

  if (!browser.scripting?.executeScript) {
    // Fallback if scripting API is unavailable (e.g. preview testing)
    return {
      title: tab.title || 'Active Web Page',
      domain: new URL(tabUrl).hostname,
      presetName,
    };
  }

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractDomPreview,
  });

  const domResult = results?.[0]?.result as
    ReturnType<typeof extractDomPreview> | undefined;

  if (!domResult) {
    return {
      title: tab.title || 'Active Web Page',
      domain: new URL(tabUrl).hostname,
      presetName,
    };
  }

  return {
    title: domResult.title,
    domain: domResult.domain || new URL(tabUrl).hostname,
    author: domResult.author,
    date: domResult.date,
    wordCount: domResult.wordCount,
    readingTime: domResult.readingTime,
    presetName,
  };
}

export async function extractSelectionFromTab(
  tab: ActiveTab,
): Promise<ExtractedSelectionPayload> {
  const tabUrl = tab.url || '';
  if (!isSupportedUrl(tabUrl)) {
    throw new Error(
      'Clipping is not supported on internal browser pages or the Chrome Web Store.',
    );
  }

  if (!tab.id) {
    throw new Error('Active browser tab ID is missing.');
  }

  if (!browser.scripting?.executeScript) {
    throw new Error('Chrome scripting API is not available.');
  }

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractDomSelection,
  });

  const domResult = results?.[0]?.result as ActiveTabSelection | undefined;

  if (!domResult) {
    throw new Error('Failed to read selection from the active tab.');
  }

  const title =
    tab.title ||
    (typeof document !== 'undefined' ? document.title : undefined) ||
    'Selection clipping';

  return {
    title,
    source: tabUrl,
    selectionText: domResult.text,
    selectionHtml: domResult.html,
    wordCount: domResult.wordCount,
    hasSelection: domResult.hasSelection,
  };
}

export async function extractFullArticleFromTab(
  tab: ActiveTab,
): Promise<ExtractedArticle> {
  const tabUrl = tab.url || '';
  if (!isSupportedUrl(tabUrl)) {
    throw new Error(
      'Clipping is not supported on internal browser pages or the Chrome Web Store.',
    );
  }

  if (!tab.id) {
    throw new Error('Active browser tab ID is missing.');
  }

  if (!browser.scripting?.executeScript) {
    throw new Error('Chrome scripting API is not available.');
  }

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['/readability-runner.js'],
  });

  const article = results?.[0]?.result as ExtractedArticle | undefined;

  if (!article) {
    throw new Error('Failed to extract article content from the page.');
  }

  if (article.error) {
    throw new Error(article.error);
  }

  return article;
}

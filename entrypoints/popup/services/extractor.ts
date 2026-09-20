import { browser } from 'wxt/browser';
import type { ExtractedArticle, PageMetadataPreview } from '../types';
import { matchPreset } from '../../schema/presets';
import { DEFAULT_PRESET } from '../../schema/constants';

const UNSUPPORTED_SCHEMES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'moz-extension://',
  'devtools://',
  'view-source:',
];

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
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
    doc.title?.trim() ||
    window.location.hostname;

  const domain = window.location.hostname;

  const author =
    doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('meta[property="article:author"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('[rel="author"]')?.textContent?.trim() ||
    undefined;

  const date =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('meta[name="date"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('time')?.getAttribute('datetime')?.trim() ||
    doc.querySelector('time')?.textContent?.trim() ||
    undefined;

  const bodyText = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';
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

export interface ActiveTab {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
}

export async function getActiveTab(): Promise<ActiveTab | null> {
  if (typeof browser === 'undefined' || !browser.tabs?.query) {
    return null;
  }
  const tabs = (await browser.tabs.query({
    active: true,
    currentWindow: true,
  })) as unknown as ActiveTab[];
  return tabs[0] || null;
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
    | ReturnType<typeof extractDomPreview>
    | undefined;

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

import { browser } from 'wxt/browser';
import type {
  ActiveTab,
  ActiveTabSelection,
  ExtractedArticle,
  ExtractedSelectionPayload,
} from './types';
import { matchPreset } from './presets';
import { DEFAULT_PRESET } from './constants';
import {
  isSupportedUrl,
  extractDomPreview,
  extractDomSelection,
} from './domExtractor';

export interface PageMetadataPreview {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount?: number;
  readingTime?: number;
  presetName: string;
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

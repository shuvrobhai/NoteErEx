import { browser } from 'wxt/browser';
import type {
  ActiveTab,
  ExtractedSelectionPayload,
} from './types';
import type { ExtensionResponse } from '../popup/types';
import {
  isSupportedUrl,
  getActiveTab,
  extractSelectionFromTab,
  extractFullArticleFromTab,
} from './extractor';
import { buildFrontmatter, serializeFrontmatter } from './frontmatter';
import { convertHtmlToMarkdown } from './conversion';
import { downloadMarkdown, formatMarkdownFilename } from './download';
import { DispatchEngine } from './dispatchEngine';
import { LocalDownloadAdapter } from './adapters/localAdapter';
import { ObsidianAdapter } from './adapters/obsidianAdapter';
import { createCanonicalPayload, type ProviderId } from './provider';

export interface ClipPipelineOptions {
  tab?: ActiveTab;
  preferredTitle?: string;
  preferredAuthor?: string;
  destinations?: string[];
  downloadLocally?: boolean;
}

export interface ClipPipelineResult {
  success: boolean;
  mode: 'selection' | 'article';
  title: string;
  filename: string;
  markdown: string;
  downloadId?: number;
  dispatchResults?: Record<string, { success: boolean; error?: string }>;
}

export const defaultPipelineDispatchEngine = new DispatchEngine();
defaultPipelineDispatchEngine.register(new LocalDownloadAdapter());
defaultPipelineDispatchEngine.register(new ObsidianAdapter());

export async function executeClip(
  options?: ClipPipelineOptions,
): Promise<ClipPipelineResult> {
  let targetTab = options?.tab;
  if (!targetTab || !targetTab.id) {
    targetTab = (await getActiveTab()) || undefined;
  }

  if (!targetTab || !targetTab.id) {
    throw new Error('No active browser tab found.');
  }

  const tabUrl = targetTab.url || '';
  if (!isSupportedUrl(tabUrl)) {
    throw new Error(
      'Clipping is not supported on internal browser pages or the Chrome Web Store.',
    );
  }

  let selectionPayload: ExtractedSelectionPayload | null;
  try {
    selectionPayload = await extractSelectionFromTab(targetTab);
  } catch {
    selectionPayload = null;
  }

  const isSelectionMode = Boolean(
    selectionPayload &&
      selectionPayload.hasSelection &&
      selectionPayload.selectionText.trim().length > 0,
  );

  let mode: 'selection' | 'article';
  let title: string;
  let filename: string;
  let markdown: string;
  let cleanHtml: string;
  let plainText: string;

  if (isSelectionMode && selectionPayload) {
    mode = 'selection';
    title =
      options?.preferredTitle || selectionPayload.title || 'Selection clipping';
    const author = options?.preferredAuthor || selectionPayload.author;
    const frontmatter = buildFrontmatter(title, selectionPayload.source, {
      author,
      published: selectionPayload.date,
      wordCount: selectionPayload.wordCount,
      type: 'highlight',
    });
    const frontmatterStr = serializeFrontmatter(frontmatter);
    const markdownBody = convertHtmlToMarkdown(selectionPayload.selectionHtml);
    markdown = frontmatterStr + markdownBody;
    cleanHtml = selectionPayload.selectionHtml;
    plainText = selectionPayload.selectionText;
    filename = formatMarkdownFilename(frontmatter.title || 'clipping', {
      suffix: 'highlight',
    });
  } else {
    mode = 'article';
    const article = await extractFullArticleFromTab(targetTab);
    const words = (article.textContent || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const wordCount = words.length;
    title =
      options?.preferredTitle ||
      article.title ||
      targetTab.title ||
      'Web Article';
    const author = options?.preferredAuthor || article.byline;
    const frontmatter = buildFrontmatter(
      title,
      article.url || targetTab.url || '',
      {
        author,
        description: article.excerpt,
        wordCount,
        type: 'article',
      },
    );
    const frontmatterStr = serializeFrontmatter(frontmatter);
    const markdownBody = convertHtmlToMarkdown(
      article.content || article.textContent || '',
    );
    markdown = frontmatterStr + markdownBody;
    cleanHtml = article.content || article.textContent || '';
    plainText = article.textContent || '';
    filename = formatMarkdownFilename(frontmatter.title || 'article');
  }

  let downloadId: number | undefined;
  if (options?.downloadLocally !== false) {
    if (
      typeof window !== 'undefined' &&
      typeof browser !== 'undefined' &&
      browser.runtime?.sendMessage
    ) {
      try {
        const response = (await browser.runtime.sendMessage({
          type: 'DOWNLOAD_MARKDOWN',
          filename,
          content: markdown,
        })) as ExtensionResponse<{ downloadId: number }> | undefined;

        if (response && response.success && response.data?.downloadId) {
          downloadId = response.data.downloadId;
        } else if (response && !response.success) {
          throw new Error(
            response.error || 'Download failed in background worker.',
          );
        } else if (typeof browser.downloads?.download === 'function') {
          downloadId = await downloadMarkdown(markdown, filename);
        }
      } catch (err: unknown) {
        if (typeof browser.downloads?.download === 'function') {
          downloadId = await downloadMarkdown(markdown, filename);
        } else {
          throw err;
        }
      }
    } else {
      downloadId = await downloadMarkdown(markdown, filename);
    }
  }

  let dispatchResults:
    | Record<string, { success: boolean; error?: string }>
    | undefined;

  if (options?.destinations && options.destinations.length > 0) {
    dispatchResults = {};
    const canonicalPayload = createCanonicalPayload({
      title,
      sourceUrl: tabUrl,
      author: options.preferredAuthor,
      markdown,
      cleanHtml,
      plainText,
    });
    const results = await defaultPipelineDispatchEngine.dispatchToAll(
      options.destinations as ProviderId[],
      canonicalPayload,
    );
    for (const res of results) {
      dispatchResults[res.providerId] = {
        success: res.success,
        error: res.error,
      };
    }
  }

  return {
    success: true,
    mode,
    title,
    filename,
    markdown,
    downloadId,
    dispatchResults,
  };
}

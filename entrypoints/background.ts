import { initializeStorage, migrateStorage } from './schema/storage';
import { downloadMarkdown, formatMarkdownFilename } from './schema/download';
import { buildFrontmatter, serializeFrontmatter } from './schema/frontmatter';
import { convertHtmlToMarkdown } from './schema/conversion';
import {
  isSupportedUrl,
  getActiveTab,
  extractSelectionFromTab,
  extractFullArticleFromTab,
} from './schema/extractor';
import type { ActiveTab, ExtractedSelectionPayload } from './schema/types';
import type { ExtensionMessage, ExtensionResponse } from './popup/types';

export interface CommandClipResult {
  success: boolean;
  filename: string;
  downloadId: number;
}

export async function handleCommandClip(
  tab?: ActiveTab,
): Promise<CommandClipResult> {
  let targetTab = tab;
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

  let fullMarkdown: string;
  let filename: string;

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

  if (isSelectionMode && selectionPayload) {
    const frontmatter = buildFrontmatter(
      selectionPayload.title,
      selectionPayload.source,
      {
        author: selectionPayload.author,
        published: selectionPayload.date,
        wordCount: selectionPayload.wordCount,
        type: 'highlight',
      },
    );
    const frontmatterStr = serializeFrontmatter(frontmatter);
    const markdownBody = convertHtmlToMarkdown(selectionPayload.selectionHtml);
    fullMarkdown = frontmatterStr + markdownBody;
    filename = formatMarkdownFilename(frontmatter.title || 'clipping', {
      suffix: 'highlight',
    });
  } else {
    const article = await extractFullArticleFromTab(targetTab);
    const words = (article.textContent || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const wordCount = words.length;

    const frontmatter = buildFrontmatter(
      article.title || targetTab.title || 'Web Article',
      article.url || targetTab.url || '',
      {
        author: article.byline,
        wordCount,
        type: 'article',
      },
    );
    const frontmatterStr = serializeFrontmatter(frontmatter);
    const markdownBody = convertHtmlToMarkdown(
      article.content || article.textContent || '',
    );
    fullMarkdown = frontmatterStr + markdownBody;
    filename = formatMarkdownFilename(frontmatter.title || 'article');
  }

  const downloadId = await downloadMarkdown(fullMarkdown, filename);
  return { success: true, filename, downloadId };
}

export default defineBackground(() => {
  console.log('Web to Markdown background service worker started');

  browser.runtime.onInstalled.addListener(async () => {
    await initializeStorage();
    await migrateStorage();
  });

  initializeStorage().catch((err) => {
    console.error('Storage initialization error:', err);
  });

  browser.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender,
      sendResponse: (response: ExtensionResponse<unknown>) => void,
    ) => {
      const msg = message as ExtensionMessage;
      if (msg?.type === 'DOWNLOAD_MARKDOWN') {
        downloadMarkdown(msg.content, msg.filename)
          .then((downloadId) => {
            sendResponse({ success: true, data: { downloadId } });
          })
          .catch((error) => {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Download failed',
            });
          });
        return true; // Keep message channel open for async response
      }
      return false;
    },
  );

  if (browser.commands?.onCommand) {
    browser.commands.onCommand.addListener(async (command, tab) => {
      if (command !== 'clip-to-markdown') {
        return;
      }

      const tabId = tab?.id;

      try {
        if (browser.action?.setBadgeText) {
          await browser.action
            .setBadgeText({ text: '…', tabId })
            .catch(() => {});
        }

        const result = await handleCommandClip(tab as unknown as ActiveTab);

        if (browser.action?.setBadgeText) {
          await browser.action
            .setBadgeText({ text: '', tabId })
            .catch(() => {});
        }

        if (browser.notifications?.create) {
          await browser.notifications
            .create({
              type: 'basic',
              iconUrl: browser.runtime?.getURL
                ? browser.runtime.getURL('/icon/128.png')
                : '/icon/128.png',
              title: 'Clipped to Markdown',
              message: `Saved ${result.filename}`,
            })
            .catch(() => {});
        }
      } catch (error) {
        if (browser.action?.setBadgeText) {
          await browser.action
            .setBadgeText({ text: '', tabId })
            .catch(() => {});
        }

        const message =
          error instanceof Error ? error.message : 'Clipping failed';
        const isUnsupported = message.includes(
          'not supported on internal browser pages',
        );

        if (browser.notifications?.create) {
          await browser.notifications
            .create({
              type: 'basic',
              iconUrl: browser.runtime?.getURL
                ? browser.runtime.getURL('/icon/128.png')
                : '/icon/128.png',
              title: isUnsupported
                ? 'Cannot clip this page'
                : 'Clipping failed',
              message,
            })
            .catch(() => {});
        }
      }
    });
  }
});

export { initializeStorage, migrateStorage } from './schema/storage';
export { getPreferences, getPresets, getDefaultPreset } from './schema/storage';
export {
  buildFrontmatter,
  serializeFrontmatter,
  getTitleFallback,
} from './schema/frontmatter';
export {
  buildTurndownConfig,
  getConversionOptions,
  convertHtmlToMarkdown,
} from './schema/conversion';
export { matchPreset, applyPreset, mergeConfig } from './schema/presets';
export { createClipError, handleError } from './schema/errors';
export {
  downloadMarkdown,
  formatMarkdownFilename,
  slugifyTitle,
  createMarkdownDataUrl,
  downloadMarkdownWithFrontmatter,
} from './schema/download';
export {
  isSupportedUrl,
  getActiveTab,
  extractPreviewFromTab,
  extractSelectionFromTab,
  extractFullArticleFromTab,
} from './schema/extractor';
export type {
  MarkdownFrontmatter,
  HighlightMarkdownFrontmatter,
  UserPreferences,
  Preset,
  ConversionOptions,
  ClipError,
  ActiveTab,
  ActiveTabSelection,
  ExtractedArticle,
  ExtractedSelectionPayload,
} from './schema/types';
export type { ExtensionMessage, ExtensionResponse } from './popup/types';

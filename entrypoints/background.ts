import { initializeStorage, migrateStorage } from './schema/storage';
import { downloadMarkdown } from './schema/download';
import type { ActiveTab } from './schema/types';
import type { ExtensionMessage, ExtensionResponse } from './popup/types';
import { DispatchEngine } from './schema/dispatchEngine';
import { LocalDownloadAdapter } from './schema/adapters/localAdapter';
import { ObsidianAdapter } from './schema/adapters/obsidianAdapter';
import { executeClip } from './schema/clipPipeline';

export const defaultDispatchEngine = new DispatchEngine();
defaultDispatchEngine.register(new LocalDownloadAdapter());
defaultDispatchEngine.register(new ObsidianAdapter());

export interface CommandClipResult {
  success: boolean;
  filename: string;
  downloadId: number;
}

export async function handleCommandClip(
  tab?: ActiveTab,
): Promise<CommandClipResult> {
  const result = await executeClip({ tab, downloadLocally: true });
  return {
    success: result.success,
    filename: result.filename,
    downloadId: result.downloadId ?? 0,
  };
}

export default defineBackground(() => {
  console.log('NoteErEx background service worker started');

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

      if (msg?.type === 'DISPATCH_CANONICAL') {
        defaultDispatchEngine
          .dispatchToAll(msg.providerIds, msg.payload)
          .then((results) => {
            sendResponse({ success: true, data: { results } });
          })
          .catch((error) => {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Dispatch failed',
            });
          });
        return true;
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
export { DispatchEngine } from './schema/dispatchEngine';
export { LocalDownloadAdapter } from './schema/adapters/localAdapter';
export { ObsidianAdapter } from './schema/adapters/obsidianAdapter';
export { createCanonicalPayload } from './schema/provider';
export {
  getProviderSettings,
  saveProviderSettings,
  ObsidianSettingsSchema,
  RootProviderSettingsSchema,
} from './schema/providerSettings';
export type {
  CanonicalMetadata,
  CanonicalNotePayload,
  ProviderId,
  DispatchResult,
  ProviderAdapter,
} from './schema/provider';
export type {
  ProviderSettings,
  ObsidianSettings,
} from './schema/providerSettings';
export { executeClip } from './schema/clipPipeline';
export type {
  ClipPipelineOptions,
  ClipPipelineResult,
} from './schema/clipPipeline';


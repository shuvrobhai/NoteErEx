import { initializeStorage, migrateStorage } from './schema/storage';
import { downloadMarkdown } from './schema/download';
import type { ExtensionMessage, ExtensionResponse } from './popup/types';

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
});

export { initializeStorage, migrateStorage } from './schema/storage';
export { getPreferences, getPresets, getDefaultPreset } from './schema/storage';
export { buildFrontmatter, serializeFrontmatter, getTitleFallback } from './schema/frontmatter';
export { buildTurndownConfig, getConversionOptions, convertHtmlToMarkdown } from './schema/conversion';
export { matchPreset, applyPreset, mergeConfig } from './schema/presets';
export { createClipError, handleError } from './schema/errors';
export {
  downloadMarkdown,
  slugifyTitle,
  createMarkdownDataUrl,
  downloadMarkdownWithFrontmatter,
} from './schema/download';
export type { MarkdownFrontmatter, UserPreferences, Preset, ConversionOptions, ClipError } from './schema/types';
export type { ExtensionMessage, ExtensionResponse, ExtractedArticle } from './popup/types';

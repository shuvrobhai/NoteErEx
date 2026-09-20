import { initializeStorage, migrateStorage } from './schema/storage';

export default defineBackground(() => {
  console.log('Web to Markdown background service worker started');

  browser.runtime.onInstalled.addListener(async () => {
    await initializeStorage();
    await migrateStorage();
  });

  initializeStorage().catch((err) => {
    console.error('Storage initialization error:', err);
  });
});

export { initializeStorage, migrateStorage } from './schema/storage';
export { getPreferences, getPresets, getDefaultPreset } from './schema/storage';
export { buildFrontmatter, serializeFrontmatter, getTitleFallback } from './schema/frontmatter';
export { buildTurndownConfig, getConversionOptions } from './schema/conversion';
export { matchPreset, applyPreset, mergeConfig } from './schema/presets';
export { createClipError, handleError } from './schema/errors';
export { downloadMarkdown } from './schema/download';
export type { MarkdownFrontmatter, UserPreferences, Preset, ConversionOptions, ClipError } from './schema/types';

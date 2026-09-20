import { DEFAULT_PREFERENCES } from './constants';
import type { Preset, UserPreferences } from './types';

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

export function matchPreset(
  tabUrl: string,
  presets: Record<string, Preset>,
  defaultPreset: Preset
): Preset {
  let hostname: string;
  try {
    hostname = normalizeHostname(new URL(tabUrl).hostname);
  } catch {
    return defaultPreset;
  }

  // Exact match first (case-insensitive and without leading www.)
  for (const [key, preset] of Object.entries(presets)) {
    if (normalizeHostname(key) === hostname) {
      return preset;
    }
  }

  // Wildcard match (e.g. *.example.com matches sub.example.com and example.com)
  for (const [key, preset] of Object.entries(presets)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith('*.')) {
      const domain = normalizeHostname(normalizedKey.slice(2));
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return preset;
      }
    }
  }

  return defaultPreset;
}

export interface MergedConfig {
  frontmatterFields: string[];
  imageHandling: 'strip' | 'preserve';
  notificationEnabled: boolean;
}

export function mergeConfig(
  preferences?: Partial<UserPreferences> | null,
  preset?: Partial<Preset> | null
): MergedConfig {
  return {
    frontmatterFields:
      preset?.frontmatterFields ??
      preferences?.frontmatterFields ??
      DEFAULT_PREFERENCES.frontmatterFields,
    imageHandling:
      preset?.imageHandling ??
      preferences?.imageHandling ??
      DEFAULT_PREFERENCES.imageHandling,
    notificationEnabled:
      preset?.notificationEnabled ??
      preferences?.notificationEnabled ??
      DEFAULT_PREFERENCES.notificationEnabled,
  };
}

export async function applyPreset(tabUrl: string): Promise<{
  preferences: UserPreferences;
  preset: Preset;
  config: MergedConfig;
}> {
  const { getPreferences, getPresets, getDefaultPreset } = await import('./storage');
  const preferences = await getPreferences();
  const presets = await getPresets();
  const defaultPreset = await getDefaultPreset();
  const preset = matchPreset(tabUrl, presets, defaultPreset);
  const config = mergeConfig(preferences, preset);
  return { preferences, preset, config };
}

import {
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_PREFERENCES,
  DEFAULT_PRESET,
} from './constants';
import type { UserPreferences, Preset } from './types';

export async function initializeStorage(): Promise<void> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.preferences,
    STORAGE_KEYS.presets,
    STORAGE_KEYS.defaultPreset,
  ]);

  if (!result[STORAGE_KEYS.preferences]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.preferences]: DEFAULT_PREFERENCES,
    });
  }

  if (!result[STORAGE_KEYS.defaultPreset]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.defaultPreset]: DEFAULT_PRESET,
    });
  }

  if (!result[STORAGE_KEYS.presets]) {
    await browser.storage.local.set({
      [STORAGE_KEYS.presets]: {},
    });
  }
}

export async function migrateStorage(): Promise<void> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.preferences,
    STORAGE_KEYS.presets,
    STORAGE_KEYS.defaultPreset,
  ]);

  const preferences = result[STORAGE_KEYS.preferences] as
    UserPreferences | undefined;
  const defaultPreset = result[STORAGE_KEYS.defaultPreset] as
    Preset | undefined;
  const presets = result[STORAGE_KEYS.presets] as
    Record<string, Preset> | undefined;

  if (preferences && preferences.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrated = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await browser.storage.local.set({
      [STORAGE_KEYS.preferences]: migrated,
    });
  }

  if (defaultPreset && defaultPreset.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrated = {
      ...DEFAULT_PRESET,
      ...defaultPreset,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    await browser.storage.local.set({
      [STORAGE_KEYS.defaultPreset]: migrated,
    });
  }

  if (presets) {
    const migratedPresets: Record<string, Preset> = {};
    for (const [key, preset] of Object.entries(presets)) {
      if (preset.schemaVersion < CURRENT_SCHEMA_VERSION) {
        migratedPresets[key] = {
          ...DEFAULT_PRESET,
          ...preset,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };
      } else {
        migratedPresets[key] = preset;
      }
    }
    await browser.storage.local.set({
      [STORAGE_KEYS.presets]: migratedPresets,
    });
  }
}

export function validatePreferences(data: unknown): UserPreferences {
  if (!data || typeof data !== 'object') return { ...DEFAULT_PREFERENCES };
  const prefs = data as Record<string, unknown>;
  return {
    frontmatterFields: Array.isArray(prefs.frontmatterFields)
      ? prefs.frontmatterFields
      : DEFAULT_PREFERENCES.frontmatterFields,
    imageHandling:
      prefs.imageHandling === 'preserve'
        ? 'preserve'
        : DEFAULT_PREFERENCES.imageHandling,
    notificationEnabled:
      typeof prefs.notificationEnabled === 'boolean'
        ? prefs.notificationEnabled
        : DEFAULT_PREFERENCES.notificationEnabled,
    schemaVersion:
      typeof prefs.schemaVersion === 'number'
        ? prefs.schemaVersion
        : CURRENT_SCHEMA_VERSION,
  };
}

export function validatePreset(data: unknown): Preset {
  if (!data || typeof data !== 'object') return { ...DEFAULT_PRESET };
  const preset = data as Record<string, unknown>;
  return {
    name: typeof preset.name === 'string' ? preset.name : DEFAULT_PRESET.name,
    frontmatterFields: Array.isArray(preset.frontmatterFields)
      ? preset.frontmatterFields
      : DEFAULT_PRESET.frontmatterFields,
    imageHandling:
      preset.imageHandling === 'preserve'
        ? 'preserve'
        : DEFAULT_PRESET.imageHandling,
    destinations: Array.isArray(preset.destinations)
      ? preset.destinations
      : DEFAULT_PRESET.destinations,
    notificationEnabled:
      typeof preset.notificationEnabled === 'boolean'
        ? preset.notificationEnabled
        : DEFAULT_PRESET.notificationEnabled,
    schemaVersion:
      typeof preset.schemaVersion === 'number'
        ? preset.schemaVersion
        : CURRENT_SCHEMA_VERSION,
  };
}

export async function getPreferences(): Promise<UserPreferences> {
  const result = await browser.storage.local.get(STORAGE_KEYS.preferences);
  return validatePreferences(result[STORAGE_KEYS.preferences]);
}

export async function getPresets(): Promise<Record<string, Preset>> {
  const result = await browser.storage.local.get(STORAGE_KEYS.presets);
  const presets = result[STORAGE_KEYS.presets] as
    Record<string, Preset> | undefined;
  if (!presets) return {};
  const validated: Record<string, Preset> = {};
  for (const [key, value] of Object.entries(presets)) {
    validated[key] = validatePreset(value);
  }
  return validated;
}

export async function getDefaultPreset(): Promise<Preset> {
  const result = await browser.storage.local.get(STORAGE_KEYS.defaultPreset);
  return validatePreset(result[STORAGE_KEYS.defaultPreset]);
}

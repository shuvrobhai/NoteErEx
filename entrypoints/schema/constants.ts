export const STORAGE_KEYS = {
  preferences: 'preferences',
  presets: 'presets',
  defaultPreset: 'defaultPreset',
} as const;

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_PREFERENCES = {
  frontmatterFields: [
    'author',
    'published',
    'description',
    'word_count',
    'reading_time',
  ],
  imageHandling: 'strip' as const,
  notificationEnabled: true,
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

export const DEFAULT_PRESET: import('./types').Preset = {
  name: 'Default',
  frontmatterFields: [
    'author',
    'published',
    'description',
    'word_count',
    'reading_time',
  ],
  imageHandling: 'strip',
  destinations: [],
  notificationEnabled: true,
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

export const CONVERSION_OPTIONS = {
  bulletListMarker: '-' as const,
  removeComments: true as const,
  codeBlockLang: true as const,
};

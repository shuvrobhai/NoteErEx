export interface MarkdownFrontmatter {
  title: string;
  source: string;
  clipped_at: string;
  author?: string;
  published?: string;
  description?: string;
  word_count?: number;
  reading_time?: number;
}

export interface UserPreferences {
  frontmatterFields: string[];
  imageHandling: 'strip' | 'preserve';
  notificationEnabled: boolean;
  schemaVersion: number;
}

export interface Preset {
  name: string;
  frontmatterFields: string[];
  imageHandling: 'strip' | 'preserve';
  destinations: string[];
  notificationEnabled: boolean;
  schemaVersion: number;
}

export interface ConversionOptions {
  bulletListMarker: '-';
  removeComments: true;
  codeBlockLang: true;
}

export interface ClipError {
  code: 'extractionError' | 'conversionError' | 'downloadError' | 'storageError';
  stage: 'extract' | 'convert' | 'download' | 'storage';
  message: string;
  url: string;
  timestamp: string;
  details?: unknown;
}

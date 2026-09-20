export interface MarkdownFrontmatter {
  title: string;
  source: string;
  clipped_at: string;
  author?: string;
  published?: string;
  description?: string;
  word_count?: number;
  reading_time?: number;
  type?: 'highlight' | 'article';
}

export interface HighlightMarkdownFrontmatter extends MarkdownFrontmatter {
  type: 'highlight';
}

export interface ExtractedSelectionPayload {
  title: string;
  source: string;
  author?: string;
  date?: string;
  selectionText: string;
  selectionHtml: string;
  wordCount: number;
  hasSelection?: boolean;
}

export interface ExtractedArticle {
  title: string;
  byline?: string;
  excerpt?: string;
  content: string;
  textContent: string;
  length: number;
  siteName?: string;
  url: string;
  error?: string;
}

export interface ActiveTabSelection {
  hasSelection: boolean;
  text: string;
  html: string;
  wordCount: number;
}

export interface ActiveTab {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
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
  codeBlockLang?: true;
  preserveCodeBlockLanguage?: true;
}

export interface ClipError {
  code:
    'extractionError' | 'conversionError' | 'downloadError' | 'storageError';
  stage: 'extract' | 'convert' | 'download' | 'storage';
  message: string;
  url: string;
  timestamp: string;
  details?: unknown;
}

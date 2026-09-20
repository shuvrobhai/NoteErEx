export type PopupStatus = 'idle' | 'clipping' | 'success' | 'error';

export interface PageMetadataPreview {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount?: number;
  readingTime?: number;
  presetName: string;
}

export interface PopupState {
  status: PopupStatus;
  metadata: PageMetadataPreview;
  errorMessage?: string;
  successFilename?: string;
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

export type ExtensionMessage =
  | {
      type: 'EXTRACT_PAGE_PREVIEW';
    }
  | {
      type: 'EXTRACT_FULL_ARTICLE';
    }
  | {
      type: 'DOWNLOAD_MARKDOWN';
      filename: string;
      content: string;
    };

export type ExtensionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };


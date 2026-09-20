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

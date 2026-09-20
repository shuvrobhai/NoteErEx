import type { PageMetadataPreview } from '../schema/extractor';
import type { ExtractedArticle, ActiveTabSelection } from '../schema/types';
import type {
  CanonicalNotePayload,
  DispatchResult,
  ProviderId,
} from '../schema/provider';

export type {
  PageMetadataPreview,
  ExtractedArticle,
  ActiveTabSelection,
  CanonicalNotePayload,
  DispatchResult,
  ProviderId,
};

export type PopupStatus = 'idle' | 'clipping' | 'success' | 'error';

export interface PopupState {
  status: PopupStatus;
  metadata: PageMetadataPreview;
  errorMessage?: string;
  successFilename?: string;
  selection?: {
    hasSelection: boolean;
    text: string;
    html: string;
    wordCount: number;
    snippet: string;
  };
}

export type ExtensionMessage =
  | {
      type: 'EXTRACT_PAGE_PREVIEW';
    }
  | {
      type: 'EXTRACT_FULL_ARTICLE';
    }
  | {
      type: 'EXTRACT_DOM_SELECTION';
    }
  | {
      type: 'DOWNLOAD_MARKDOWN';
      filename: string;
      content: string;
    }
  | {
      type: 'DISPATCH_CANONICAL';
      providerIds: readonly ProviderId[];
      payload: CanonicalNotePayload;
    };

export type ExtensionResponse<T> =
  { success: true; data: T } | { success: false; error: string };

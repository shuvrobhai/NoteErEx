/**
 * Canonical Intermediate Representation (IR) and Adapter Contracts.
 * Normalizes web extraction data so adapters can format for any target platform.
 */

export interface CanonicalMetadata {
  readonly title: string;
  readonly sourceUrl: string;
  readonly capturedAt: string;
  readonly author?: string;
  readonly publishedAt?: string;
  readonly excerpt?: string;
  readonly favicon?: string;
  readonly wordCount?: number;
  readonly readingTimeMinutes?: number;
  readonly tags?: readonly string[];
}

export interface CanonicalNotePayload {
  readonly id: string;
  readonly metadata: CanonicalMetadata;
  readonly markdown: string;
  readonly cleanHtml: string;
  readonly plainText: string;
}

export type ProviderId =
  'local' | 'obsidian' | 'notion' | 'gdocs' | 'apple_notes' | 'apple_pages';

export interface DispatchResult {
  readonly providerId: ProviderId;
  readonly success: boolean;
  readonly destinationUrl?: string;
  readonly error?: string;
  readonly durationMs?: number;
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly name: string;
  isConfigured(): Promise<boolean>;
  dispatch(payload: CanonicalNotePayload): Promise<DispatchResult>;
}

export const createCanonicalPayload = (params: {
  id?: string;
  title: string;
  sourceUrl: string;
  capturedAt?: string;
  author?: string;
  publishedAt?: string;
  excerpt?: string;
  favicon?: string;
  wordCount?: number;
  readingTimeMinutes?: number;
  tags?: readonly string[];
  markdown: string;
  cleanHtml: string;
  plainText: string;
}): CanonicalNotePayload => {
  return {
    id: params.id ?? `clip-${Date.now()}`,
    metadata: {
      title: params.title.trim(),
      sourceUrl: params.sourceUrl.trim(),
      capturedAt: params.capturedAt ?? new Date().toISOString(),
      ...(params.author ? { author: params.author.trim() } : {}),
      ...(params.publishedAt ? { publishedAt: params.publishedAt.trim() } : {}),
      ...(params.excerpt ? { excerpt: params.excerpt.trim() } : {}),
      ...(params.favicon ? { favicon: params.favicon.trim() } : {}),
      ...(params.wordCount !== undefined
        ? { wordCount: params.wordCount }
        : {}),
      ...(params.readingTimeMinutes !== undefined
        ? { readingTimeMinutes: params.readingTimeMinutes }
        : {}),
      ...(params.tags ? { tags: params.tags } : {}),
    },
    markdown: params.markdown,
    cleanHtml: params.cleanHtml,
    plainText: params.plainText,
  };
};

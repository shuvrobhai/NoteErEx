import type {
  CanonicalNotePayload,
  DispatchResult,
  ProviderAdapter,
} from '../provider';
import { downloadMarkdown } from '../download';

/**
 * Local Download Adapter.
 * Converts markdown payload into a UTF-8 data URL and triggers browser file download.
 */
export class LocalDownloadAdapter implements ProviderAdapter {
  public readonly id = 'local' as const;
  public readonly name = 'Local Markdown Download';

  public async isConfigured(): Promise<boolean> {
    return true; // Zero-config required for local downloads.
  }

  public async dispatch(
    payload: CanonicalNotePayload,
  ): Promise<DispatchResult> {
    try {
      const filename = payload.metadata.title || 'clipping';
      await downloadMarkdown(payload.markdown, filename);
      return {
        providerId: this.id,
        success: true,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to download markdown file';
      return {
        providerId: this.id,
        success: false,
        error: message,
      };
    }
  }
}

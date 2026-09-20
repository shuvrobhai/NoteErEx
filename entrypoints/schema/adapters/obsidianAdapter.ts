import { browser } from 'wxt/browser';
import type {
  CanonicalNotePayload,
  DispatchResult,
  ProviderAdapter,
} from '../provider';
import { getProviderSettings } from '../providerSettings';

/**
 * Obsidian URI Adapter.
 * Dispatches clips directly into Obsidian vaults via the obsidian:// protocol.
 * Citation: https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
 */
export class ObsidianAdapter implements ProviderAdapter {
  public readonly id = 'obsidian' as const;
  public readonly name = 'Obsidian';

  public async isConfigured(): Promise<boolean> {
    const settings = await getProviderSettings();
    return Boolean(
      settings.obsidian?.enabled && settings.obsidian.vaultName.trim(),
    );
  }

  public async dispatch(
    payload: CanonicalNotePayload,
  ): Promise<DispatchResult> {
    const settings = await getProviderSettings();
    const config = settings.obsidian;

    if (!config || !config.enabled || !config.vaultName.trim()) {
      return {
        providerId: this.id,
        success: false,
        error: 'Obsidian integration is not configured or disabled',
      };
    }

    const safeTitle = (payload.metadata.title || 'Untitled')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim();

    const noteFolder = config.noteFolder.trim();
    const filePath = [noteFolder, safeTitle].filter(Boolean).join('/');

    const uri =
      `obsidian://new?vault=${encodeURIComponent(config.vaultName.trim())}` +
      `&file=${encodeURIComponent(filePath)}` +
      `&content=${encodeURIComponent(payload.markdown)}`;

    if (uri.length > config.maxUriLength) {
      return {
        providerId: this.id,
        success: false,
        error: `Content length (${uri.length} chars) exceeds the ${config.maxUriLength} character URI limit. Use local Markdown export instead.`,
      };
    }

    try {
      await browser.tabs.create({ url: uri, active: false });
      return {
        providerId: this.id,
        success: true,
        destinationUrl: uri,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to trigger Obsidian URI handler';
      return {
        providerId: this.id,
        success: false,
        error: message,
      };
    }
  }
}

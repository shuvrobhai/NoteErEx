import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';
import { ObsidianAdapter } from '../entrypoints/schema/adapters/obsidianAdapter';
import {
  createCanonicalPayload,
  type CanonicalNotePayload,
} from '../entrypoints/schema/provider';
import * as providerSettingsModule from '../entrypoints/schema/providerSettings';

describe('Obsidian Adapter (Slice 4, Milestone 3)', () => {
  let adapter: ObsidianAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ObsidianAdapter();
  });

  const samplePayload: CanonicalNotePayload = createCanonicalPayload({
    title: 'Research Notes: Advanced AI Patterns',
    sourceUrl: 'https://example.com/ai',
    markdown: '# AI Patterns\n\nDetailed breakdown of agent patterns.',
    cleanHtml: '<h1>AI Patterns</h1>',
    plainText: 'AI Patterns',
  });

  it('reports not configured when disabled or vaultName is empty', async () => {
    vi.spyOn(providerSettingsModule, 'getProviderSettings').mockResolvedValue({
      obsidian: {
        enabled: false,
        vaultName: '',
        noteFolder: 'Clippings',
        maxUriLength: 2000,
      },
      lastActiveDestinations: ['local'],
    });

    expect(await adapter.isConfigured()).toBe(false);

    const result = await adapter.dispatch(samplePayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('reports configured when enabled with a non-empty vault name', async () => {
    vi.spyOn(providerSettingsModule, 'getProviderSettings').mockResolvedValue({
      obsidian: {
        enabled: true,
        vaultName: 'SecondBrain',
        noteFolder: 'Inbox',
        maxUriLength: 2000,
      },
      lastActiveDestinations: ['obsidian'],
    });

    expect(await adapter.isConfigured()).toBe(true);
  });

  it('constructs properly percent-encoded obsidian:// URI and opens tab', async () => {
    vi.spyOn(providerSettingsModule, 'getProviderSettings').mockResolvedValue({
      obsidian: {
        enabled: true,
        vaultName: 'Main Vault',
        noteFolder: 'Web Clips',
        maxUriLength: 2000,
      },
      lastActiveDestinations: ['obsidian'],
    });

    const createTabSpy = vi
      .spyOn(browser.tabs, 'create')
      .mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof browser.tabs.create>>,
      );

    const result = await adapter.dispatch(samplePayload);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe('obsidian');
    expect(result.destinationUrl).toBeDefined();

    const dispatchedUri = result.destinationUrl!;
    expect(dispatchedUri.startsWith('obsidian://new?')).toBe(true);
    expect(dispatchedUri).toContain('vault=Main%20Vault');
    expect(dispatchedUri).toContain(
      'file=' +
        encodeURIComponent('Web Clips/Research Notes Advanced AI Patterns'),
    );
    expect(dispatchedUri).toContain(
      'content=' + encodeURIComponent(samplePayload.markdown),
    );

    expect(createTabSpy).toHaveBeenCalledWith({
      url: dispatchedUri,
      active: false,
    });
  });

  it('enforces maxUriLength guard and aborts without opening tab', async () => {
    vi.spyOn(providerSettingsModule, 'getProviderSettings').mockResolvedValue({
      obsidian: {
        enabled: true,
        vaultName: 'Main Vault',
        noteFolder: 'Web Clips',
        maxUriLength: 100, // Artificially low limit
      },
      lastActiveDestinations: ['obsidian'],
    });

    const createTabSpy = vi.spyOn(browser.tabs, 'create');

    const result = await adapter.dispatch(samplePayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds the 100 character URI limit');
    expect(createTabSpy).not.toHaveBeenCalled();
  });
});

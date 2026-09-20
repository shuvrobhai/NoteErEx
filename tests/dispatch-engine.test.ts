import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchEngine } from '../entrypoints/schema/dispatchEngine';
import {
  createCanonicalPayload,
  type CanonicalNotePayload,
  type ProviderAdapter,
} from '../entrypoints/schema/provider';
import { LocalDownloadAdapter } from '../entrypoints/schema/adapters/localAdapter';
import * as downloadModule from '../entrypoints/schema/download';
import {
  ObsidianSettingsSchema,
  RootProviderSettingsSchema,
} from '../entrypoints/schema/providerSettings';

describe('Canonical IR & Dispatch Engine (Slice 4, Milestones 1 & 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCanonicalPayload', () => {
    it('creates a standardized payload with required fields and defaults', () => {
      const payload = createCanonicalPayload({
        title: 'Building Modern Chrome Extensions',
        sourceUrl: 'https://example.com/article',
        markdown: '# Title\n\nContent',
        cleanHtml: '<h1>Title</h1><p>Content</p>',
        plainText: 'Title\nContent',
      });

      expect(payload.id).toMatch(/^clip-\d+$/);
      expect(payload.metadata.title).toBe('Building Modern Chrome Extensions');
      expect(payload.metadata.sourceUrl).toBe('https://example.com/article');
      expect(payload.metadata.capturedAt).toBeDefined();
      expect(payload.markdown).toBe('# Title\n\nContent');
      expect(payload.cleanHtml).toBe('<h1>Title</h1><p>Content</p>');
      expect(payload.plainText).toBe('Title\nContent');
    });

    it('preserves optional metadata fields when provided', () => {
      const payload = createCanonicalPayload({
        title: 'TypeScript 5.8 Overview',
        sourceUrl: 'https://devblogs.microsoft.com/typescript',
        author: 'Daniel Rosenwasser',
        publishedAt: '2026-02-28',
        wordCount: 1500,
        tags: ['TypeScript', 'JavaScript'],
        markdown: '# TS 5.8',
        cleanHtml: '<p>TS 5.8</p>',
        plainText: 'TS 5.8',
      });

      expect(payload.metadata.author).toBe('Daniel Rosenwasser');
      expect(payload.metadata.publishedAt).toBe('2026-02-28');
      expect(payload.metadata.wordCount).toBe(1500);
      expect(payload.metadata.tags).toEqual(['TypeScript', 'JavaScript']);
    });
  });

  describe('DispatchEngine', () => {
    const samplePayload: CanonicalNotePayload = createCanonicalPayload({
      title: 'Testing Dispatch Engine',
      sourceUrl: 'https://example.com',
      markdown: 'Sample markdown',
      cleanHtml: '<p>Sample markdown</p>',
      plainText: 'Sample markdown',
    });

    it('registers adapters and exposes registered provider IDs', () => {
      const engine = new DispatchEngine();
      const mockAdapter: ProviderAdapter = {
        id: 'local',
        name: 'Mock Local',
        isConfigured: async () => true,
        dispatch: async () => ({ providerId: 'local', success: true }),
      };

      engine.register(mockAdapter);
      expect(engine.getRegisteredProviderIds()).toEqual(['local']);
      expect(engine.getAdapter('local')).toBe(mockAdapter);
      expect(engine.getAdapter('obsidian')).toBeUndefined();
    });

    it('dispatches to multiple adapters concurrently', async () => {
      const engine = new DispatchEngine();

      const adapter1: ProviderAdapter = {
        id: 'local',
        name: 'Adapter 1',
        isConfigured: async () => true,
        dispatch: async () => ({ providerId: 'local', success: true }),
      };

      const adapter2: ProviderAdapter = {
        id: 'obsidian',
        name: 'Adapter 2',
        isConfigured: async () => true,
        dispatch: async () => ({
          providerId: 'obsidian',
          success: true,
          destinationUrl: 'obsidian://new?vault=MyVault',
        }),
      };

      engine.register(adapter1);
      engine.register(adapter2);

      const results = await engine.dispatchToAll(
        ['local', 'obsidian'],
        samplePayload,
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.providerId).toBe('local');
      expect(results[1]!.success).toBe(true);
      expect(results[1]!.providerId).toBe('obsidian');
      expect(results[1]!.destinationUrl).toBe('obsidian://new?vault=MyVault');
      expect(typeof results[0]!.durationMs).toBe('number');
    });

    it('isolates failures when an adapter throws an exception', async () => {
      const engine = new DispatchEngine();

      const workingAdapter: ProviderAdapter = {
        id: 'local',
        name: 'Working Local',
        isConfigured: async () => true,
        dispatch: async () => ({ providerId: 'local', success: true }),
      };

      const failingAdapter: ProviderAdapter = {
        id: 'obsidian',
        name: 'Failing Obsidian',
        isConfigured: async () => true,
        dispatch: async () => {
          throw new Error('Obsidian handler crashed');
        },
      };

      engine.register(workingAdapter);
      engine.register(failingAdapter);

      const results = await engine.dispatchToAll(
        ['local', 'obsidian'],
        samplePayload,
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.providerId).toBe('local');

      expect(results[1]!.success).toBe(false);
      expect(results[1]!.providerId).toBe('obsidian');
      expect(results[1]!.error).toBe('Obsidian handler crashed');
    });

    it('returns a failure result for unregistered provider IDs', async () => {
      const engine = new DispatchEngine();
      const results = await engine.dispatchToAll(['notion'], samplePayload);

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.providerId).toBe('notion');
      expect(results[0]!.error).toContain('is not registered');
    });

    it('returns a failure result when an adapter is not configured', async () => {
      const engine = new DispatchEngine();
      const unconfiguredAdapter: ProviderAdapter = {
        id: 'obsidian',
        name: 'Obsidian App',
        isConfigured: async () => false,
        dispatch: async () => ({ providerId: 'obsidian', success: true }),
      };

      engine.register(unconfiguredAdapter);
      const results = await engine.dispatchToAll(['obsidian'], samplePayload);

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.error).toContain('is not configured');
    });
  });

  describe('LocalDownloadAdapter', () => {
    it('is always configured and triggers downloadMarkdown', async () => {
      const adapter = new LocalDownloadAdapter();
      expect(await adapter.isConfigured()).toBe(true);

      const downloadSpy = vi
        .spyOn(downloadModule, 'downloadMarkdown')
        .mockResolvedValue(42);

      const payload = createCanonicalPayload({
        title: 'Local Test File',
        sourceUrl: 'https://example.com',
        markdown: '# Content',
        cleanHtml: '<h1>Content</h1>',
        plainText: 'Content',
      });

      const result = await adapter.dispatch(payload);

      expect(result.success).toBe(true);
      expect(result.providerId).toBe('local');
      expect(downloadSpy).toHaveBeenCalledWith('# Content', 'Local Test File');
    });
  });

  describe('ProviderSettings Schema Validation', () => {
    it('validates valid obsidian settings and applies defaults', () => {
      const valid = ObsidianSettingsSchema.parse({
        enabled: true,
        vaultName: 'Personal Notes',
      });

      expect(valid.enabled).toBe(true);
      expect(valid.vaultName).toBe('Personal Notes');
      expect(valid.noteFolder).toBe('Clippings');
      expect(valid.maxUriLength).toBe(2000);
    });

    it('rejects invalid folder names with illegal characters', () => {
      expect(() => {
        ObsidianSettingsSchema.parse({
          vaultName: 'Vault',
          noteFolder: 'Folder/With?Invalid:Chars',
        });
      }).toThrow();
    });

    it('validates RootProviderSettingsSchema with default fallback', () => {
      const root = RootProviderSettingsSchema.parse({});
      expect(root.lastActiveDestinations).toEqual(['local']);
      expect(root.obsidian.enabled).toBe(false);
      expect(root.obsidian.vaultName).toBe('');
    });
  });
});

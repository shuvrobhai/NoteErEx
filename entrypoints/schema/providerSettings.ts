import { z } from 'zod';
import { browser } from 'wxt/browser';

/**
 * Obsidian Settings Schema.
 * Constraint: obsidian:// URI values must be percent-encoded.
 * Citation: https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
 */
export const ObsidianSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  vaultName: z.string().trim().max(100).default(''),
  noteFolder: z
    .string()
    .trim()
    .regex(/^[^\\:*?"<>|]*$/, 'Invalid folder name character')
    .default('Clippings'),
  // Guard against operating system URI handler truncation (>2000 chars)
  maxUriLength: z.number().int().min(500).max(8000).default(2000),
});

export const RootProviderSettingsSchema = z.object({
  obsidian: ObsidianSettingsSchema.default({
    enabled: false,
    vaultName: '',
    noteFolder: 'Clippings',
    maxUriLength: 2000,
  }),
  lastActiveDestinations: z.array(z.string()).default(['local']),
});

export type ProviderSettings = z.infer<typeof RootProviderSettingsSchema>;
export type ObsidianSettings = z.infer<typeof ObsidianSettingsSchema>;

export const PROVIDER_STORAGE_KEY = 'noteerex_provider_settings';

/**
 * Retrieves validated provider settings from browser sync storage.
 * Automatically falls back to defaults if data is absent or corrupt.
 */
export const getProviderSettings = async (): Promise<ProviderSettings> => {
  try {
    const stored = await browser.storage.sync.get(PROVIDER_STORAGE_KEY);
    const candidate = stored[PROVIDER_STORAGE_KEY];
    const parsed = RootProviderSettingsSchema.safeParse(candidate ?? {});
    if (!parsed.success) {
      return RootProviderSettingsSchema.parse({});
    }
    return parsed.data;
  } catch {
    return RootProviderSettingsSchema.parse({});
  }
};

/**
 * Saves provider settings updates into browser sync storage with validation.
 */
export const saveProviderSettings = async (
  patch: Partial<ProviderSettings>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const current = await getProviderSettings();
    const merged = { ...current, ...patch };
    const validated = RootProviderSettingsSchema.parse(merged);
    await browser.storage.sync.set({ [PROVIDER_STORAGE_KEY]: validated });
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? 'Invalid settings payload')
        : err instanceof Error
          ? err.message
          : 'Failed to save provider settings';
    return { success: false, error: message };
  }
};

import type {
  CanonicalNotePayload,
  DispatchResult,
  ProviderAdapter,
  ProviderId,
} from './provider';

/**
 * Orchestrates multi-destination dispatch with failure isolation.
 * Individual provider timeouts or failures never abort other concurrent dispatches.
 */
export class DispatchEngine {
  private readonly adapters = new Map<ProviderId, ProviderAdapter>();

  public register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public getRegisteredProviderIds(): readonly ProviderId[] {
    return Array.from(this.adapters.keys());
  }

  public async dispatchToAll(
    providerIds: readonly ProviderId[],
    payload: CanonicalNotePayload,
  ): Promise<readonly DispatchResult[]> {
    const tasks = providerIds.map(async (id): Promise<DispatchResult> => {
      const adapter = this.adapters.get(id);
      if (!adapter) {
        return {
          providerId: id,
          success: false,
          error: `Provider adapter "${id}" is not registered`,
        };
      }

      const configured = await adapter.isConfigured();
      if (!configured) {
        return {
          providerId: id,
          success: false,
          error: `Provider "${adapter.name}" is not configured`,
        };
      }

      const start = performance.now();
      try {
        const result = await adapter.dispatch(payload);
        return {
          ...result,
          durationMs: Math.round(performance.now() - start),
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unknown dispatch error';
        return {
          providerId: id,
          success: false,
          error: message,
          durationMs: Math.round(performance.now() - start),
        };
      }
    });

    const settled = await Promise.allSettled(tasks);

    return settled.map((outcome, index): DispatchResult => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      const providerId = providerIds[index] ?? 'local';
      const errorMsg =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : 'Unexpected dispatch failure';
      return {
        providerId,
        success: false,
        error: errorMsg,
      };
    });
  }
}

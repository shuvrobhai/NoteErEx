# 0007. Multi destination dispatch engine and canonical representation

**Date**: 2026-09-21
**Status**: In Progress

## Summary

This specification defines the multi destination dispatch engine and canonical intermediate representation for NoteErEx. It decouples content extraction from destination formatting by establishing a standard payload containing markdown, sanitized HTML, plain text, and metadata. Individual destination adapters consume this canonical payload and dispatch it through their native transport channels. Slice 4 implements the engine foundation, the local download adapter, and the Obsidian URI adapter.

## Context

NoteErEx is expanding from a single markdown file downloader into a universal web clipping pipeline. Users want to capture reading material and route it directly into their personal knowledge management tools such as Obsidian, Notion, Google Docs, Apple Notes, and Apple Pages. In fact, users want the ability to dispatch a single clip to multiple destinations simultaneously.

Each target platform requires a distinct data format and transport protocol. Obsidian uses percent encoded URIs with local vault paths. Notion requires structured block objects sent to a REST API. Google Docs requires rich HTML uploaded to Google Drive. Apple Notes lacks a public write API and relies on the system clipboard.

Attempting to couple extraction directly to multiple destination apps creates brittle code. Without an intermediate normalization layer, every new note taking app would require rewriting Readability processing and DOM sanitization. We need a clean adapter pattern where extraction outputs a single canonical representation, and independent adapters translate that representation for each destination.

## Requirements

**User stories**:
- As a user, I want to send clipped web articles directly to Obsidian using custom vault paths so that my notes are immediately organized in my knowledge base.
- As a user, I want the option to save locally and dispatch to Obsidian in the same action so that I maintain an offline file backup.
- As a user, I want clear feedback if an individual destination fails, without that failure cancelling my other successful destinations.

**Acceptance criteria**:
- **AC-1**: Content extraction standardizes active tab data into a type checked `CanonicalNotePayload` with title, source URL, markdown with YAML frontmatter, clean HTML, plain text, and ISO 8601 timestamps.
- **AC-2**: Provider settings persist in extension storage and validate through Zod schemas before saving or reading.
- **AC-3**: `DispatchEngine` accepts a list of provider identifiers and executes dispatches concurrently using `Promise.allSettled` to isolate failures.
- **AC-4**: `LocalDownloadAdapter` packages markdown into a UTF-8 data URL and triggers the background download loop, preserving existing local download behavior.
- **AC-5**: `ObsidianAdapter` creates an `obsidian://new` URI with properly percent encoded parameters for vault name, note folder, and file content.
- **AC-6**: `ObsidianAdapter` enforces a 2,000 character URI length guard, returning a descriptive error when article content exceeds safe operating system URL handler limits.
- **AC-7**: The popup interface and background service worker communicate dispatch requests using type safe message payloads and report per destination success or error statuses.

## Options considered

### Option 1: Canonical intermediate representation with strategy adapters (Chosen)

Extract page content once into a normalized payload containing markdown, clean HTML, plain text, and metadata. Register modular provider adapters with a central dispatch engine that runs selected destinations in parallel.

**Pros**:
- Clean separation of concerns between extraction, conversion, and transport.
- Adding future providers like Notion or Google Docs requires only a new adapter file without touching existing code.
- Failure isolation ensures a slow or failed network request never halts local file creation.
- Enables simultaneous multi destination dispatch with clean progress feedback.

**Cons**:
- Requires maintaining multiple output representations (markdown and clean HTML) in memory during the dispatch lifecycle.

### Option 2: Direct converter chaining

Convert content directly from the DOM into destination specific structures at the moment of clicking each individual action button.

**Pros**:
- Slightly simpler initial code for a single provider.

**Cons**:
- Impossible to run multiple simultaneous destinations cleanly without re parsing the tab DOM.
- Tightly couples UI buttons to third party platform APIs.

## Decision

**Chosen option**: Option 1: Canonical intermediate representation with strategy adapters.

We adopt the canonical intermediate representation and adapter pattern. The extraction engine produces a single `CanonicalNotePayload`, which the `DispatchEngine` routes to registered instances of `ProviderAdapter`.

## Feature design

**Data model sketch**:

```typescript
export interface CanonicalMetadata {
  title: string;
  sourceUrl: string;
  capturedAt: string;
  author?: string;
  publishedAt?: string;
  excerpt?: string;
  favicon?: string;
  wordCount?: number;
  tags?: string[];
}

export interface CanonicalNotePayload {
  id: string;
  metadata: CanonicalMetadata;
  markdown: string;
  cleanHtml: string;
  plainText: string;
}

export interface DispatchResult {
  providerId: ProviderId;
  success: boolean;
  destinationUrl?: string;
  error?: string;
  durationMs?: number;
}

export type ProviderId = 'local' | 'obsidian' | 'notion' | 'gdocs' | 'apple_notes' | 'apple_pages';

export interface ProviderAdapter {
  id: ProviderId;
  name: string;
  isConfigured(): Promise<boolean>;
  dispatch(payload: CanonicalNotePayload): Promise<DispatchResult>;
}
```

**Provider settings schema**:

```typescript
import { z } from 'zod';

export const ObsidianSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  vaultName: z.string().trim().min(1).max(100),
  noteFolder: z
    .string()
    .trim()
    .regex(/^[^\\:*?"<>|]*$/, 'Invalid folder name character')
    .default('Clippings'),
  maxUriLength: z.number().int().min(500).max(8000).default(2000),
});

export const RootProviderSettingsSchema = z.object({
  obsidian: ObsidianSettingsSchema.optional(),
  lastActiveDestinations: z.array(z.string()).default(['local']),
});
```

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Build payload | Title, author, date, excerpt | Mozilla Readability or DOM selection |
| Build payload | Markdown string | Turndown with GFM plugin |
| Build payload | Clean HTML | Sanitized article content element |
| Build payload | Plain text | Extracted article text content |
| Obsidian dispatch | URI target vault | `providerSettings.obsidian.vaultName` |
| Obsidian dispatch | Target note path | Sanitized title prefixed with folder |
| Obsidian dispatch | Percent encoded URL | Built from vault, path, and markdown |
| Local dispatch | Downloaded filename | `formatMarkdownFilename` utility |

**Key invariants**:
- The active tab DOM is read only during extraction; no adapter may execute scripts in the page.
- Adapters execute independently; an exception in one adapter never halts another adapter.
- Obsidian URIs must percent encode all path separators and reserved query parameters.
- URIs exceeding the configured length limit must fail gracefully rather than invoking truncated browser navigation.

**Critical test scenarios**:
- Happy path: Build payload and dispatch to local download, verifying **AC-1**, **AC-3**, **AC-4**.
- Obsidian dispatch: Dispatch payload with short markdown, verifying proper `obsidian://new` URI construction, verifying **AC-5**.
- Obsidian guard: Dispatch payload with markdown exceeding length limit, verifying descriptive error, verifying **AC-6**.
- Concurrent dispatch: Dispatch to both local and Obsidian simultaneously, verifying independent results, verifying **AC-3**.
- Storage validation: Read and write provider settings with Zod validation, verifying **AC-2**.

## Build plan

1. Install `zod` dependency for schema definition and runtime validation, satisfies **AC-2**.
2. Create Canonical IR types in `entrypoints/schema/provider.ts`, satisfies **AC-1**.
3. Create Provider Settings schema and storage helper in `entrypoints/schema/providerSettings.ts`, satisfies **AC-2**.
4. Implement `DispatchEngine` with `Promise.allSettled` failure isolation in `entrypoints/schema/dispatchEngine.ts`, satisfies **AC-3**.
5. Implement `LocalDownloadAdapter` wrapping background data URL download loop in `entrypoints/schema/adapters/localAdapter.ts`, satisfies **AC-4**.
6. Implement `ObsidianAdapter` with URI length guard in `entrypoints/schema/adapters/obsidianAdapter.ts`, satisfies **AC-5**, **AC-6**.
7. Wire `DispatchEngine` into `entrypoints/background.ts` and update popup dispatch actions, satisfies **AC-7**.
8. Add automated unit test suite covering Canonical IR, Obsidian URI generation, and dispatch engine, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**.

## Consequences

**Positive**:
- Extensible architecture ready to welcome Notion, Google Docs, and Apple ecosystem adapters.
- Simultaneous multi target export becomes a native capability.
- Zod guarantees clean configuration storage with automatic fallback defaults.

**Negative and tradeoffs**:
- Slightly increased bundle size by introducing Zod.
- Obsidian URI integration has length constraints on long articles without native filesystem permissions.

## References

**Project sources**:
- `entrypoints/schema/download.ts`: existing data URL generation and filename slugification.
- `entrypoints/background.ts`: existing service worker message listener.
- `docs/specs/0002-extension-schema-and-settings.md`: storage conventions and preset types.

**Practices and standards**:
- Gang of Four Adapter and Strategy patterns for multi target formatting.
- Obsidian official URI documentation (`https://help.obsidian.md/Extending+Obsidian/Obsidian+URI`).

# Architecture

NoteErEx is a Manifest V3 browser extension that extracts web content and
dispatches it to note-taking destinations. This document describes the system
as it exists today. When the design changes, edit this file — do not append.

## Pipeline

```
   Web page (active tab)
            │
            │  browser.scripting.executeScript
            ▼
   ┌────────────────────────┐
   │  readability-runner    │   full article  ──► ExtractedArticle
   │  OR                    │
   │  extractDomSelection   │   text selection ──► ActiveTabSelection
   └────────────────────────┘
            │
            ▼
   ┌────────────────────────┐
   │  executeClip           │   picks mode, builds frontmatter,
   │  (clipPipeline.ts)     │   converts HTML → Markdown
   └────────────────────────┘
            │
            ├──► DOWNLOAD_MARKDOWN  ──► background.ts ──► data URL ──► disk
            │
            └──► DISPATCH_CANONICAL ──► DispatchEngine ──► adapters
                                          │
                                          ├── LocalDownloadAdapter
                                          └── ObsidianAdapter
```

`executeClip` is the single clip entry point. Both the popup (`App.tsx`
`handleClip`) and the keyboard shortcut (`background.ts` `handleCommandClip`)
call it. Neither reimplements the pipeline.

## Module map

| File | Owns |
|---|---|
| `entrypoints/background.ts` | Service worker. Storage init, `DOWNLOAD_MARKDOWN` and `DISPATCH_CANONICAL` message handlers, `clip-to-markdown` command listener, notifications. |
| `entrypoints/readability-runner.ts` | Unlisted script executed in the tab context. Runs Mozilla Readability. |
| `entrypoints/schema/types.ts` | `MarkdownFrontmatter`, `ExtractedArticle`, `ActiveTabSelection`, `ActiveTab`, `UserPreferences`, `Preset`, `ConversionOptions`, `ClipError`. |
| `entrypoints/schema/constants.ts` | Storage keys, `CURRENT_SCHEMA_VERSION`, default preferences and preset. |
| `entrypoints/schema/storage.ts` | `chrome.storage.local` init, migration, runtime validation, getters. |
| `entrypoints/schema/frontmatter.ts` | Builds and serializes YAML frontmatter. Title fallback, date normalization, optional-field omission. |
| `entrypoints/schema/presets.ts` | Hostname normalization, exact and wildcard preset matching, `mergeConfig`, `applyPreset`. |
| `entrypoints/schema/conversion.ts` | Turndown factory (GFM, image handling) and `convertHtmlToMarkdown`. |
| `entrypoints/schema/download.ts` | Filename slugification, data URL creation, `browser.downloads.download` dispatch. |
| `entrypoints/schema/errors.ts` | `ClipError` construction and notification/badge fallback. |
| `entrypoints/schema/domExtractor.ts` | **Pure DOM.** `isSupportedUrl`, `countWords`, `sanitizeNode`, `extractDomPreview`, `extractDomSelection`. No `browser` or `wxt` imports. |
| `entrypoints/schema/tabExtractor.ts` | **Browser APIs.** `getActiveTab`, `extractPreviewFromTab`, `extractSelectionFromTab`, `extractFullArticleFromTab`. |
| `entrypoints/schema/extractor.ts` | Barrel re-export of the two modules above. Backwards compatibility only. |
| `entrypoints/schema/clipPipeline.ts` | `executeClip`. Orchestrates extraction → frontmatter → conversion → download → dispatch. |
| `entrypoints/schema/provider.ts` | Canonical IR types: `CanonicalNotePayload`, `CanonicalMetadata`, `ProviderAdapter`, `DispatchResult`, `ProviderId`. |
| `entrypoints/schema/dispatchEngine.ts` | `DispatchEngine` class. Registers adapters, runs `dispatchToAll` with `Promise.allSettled`. |
| `entrypoints/schema/providerSettings.ts` | Zod schemas and getters/setters for provider config. |
| `entrypoints/schema/adapters/localAdapter.ts` | `LocalDownloadAdapter`. Wraps `downloadMarkdown`. |
| `entrypoints/schema/adapters/obsidianAdapter.ts` | `ObsidianAdapter`. Builds `obsidian://new` URIs with length guard. |
| `entrypoints/popup/App.tsx` | Popup shell. Loads preview on mount, wires the action button to `executeClip`. |
| `entrypoints/popup/components/*` | Header, preview card, action button, status feedback. |
| `entrypoints/popup/services/extractor.ts` | Thin re-export of `schema/extractor` for the popup. |

## Boundaries

Three rules keep the code testable and the modules shallow:

1. **Pure DOM vs. browser APIs.** `domExtractor.ts` accepts `Document` and
   `Window` as parameters and imports nothing from `wxt/browser` or `chrome`.
   Every test in `tests/dom-extractor.test.ts` runs in happy-dom with zero
   mocks. Browser APIs live only in `tabExtractor.ts`, `background.ts`,
   `clipPipeline.ts`, `storage.ts`, `providerSettings.ts`, `download.ts`,
   `errors.ts`, and the adapters.

2. **One clip entry point.** `executeClip` handles tab resolution, selection
   detection, frontmatter, conversion, and dispatch. Adding a destination or a
   frontmatter field changes one file.

3. **Downloads survive popup unmount.** The popup sends `DOWNLOAD_MARKDOWN`
   to the background service worker, which owns `browser.downloads.download`
   and uses a `data:text/markdown;charset=utf-8,` URL. No blob URLs — they
   are revoked when the popup closes.

## Data shapes

```ts
interface MarkdownFrontmatter {
  title: string;              // required
  source: string;             // required
  clipped_at: string;         // required, ISO 8601
  author?: string;
  published?: string;
  description?: string;
  word_count?: number;
  reading_time?: number;
  type?: 'highlight' | 'article';
}

interface CanonicalNotePayload {
  id: string;
  metadata: CanonicalMetadata;  // title, sourceUrl, capturedAt, +optionals
  markdown: string;
  cleanHtml: string;
  plainText: string;
}

interface ProviderAdapter {
  id: ProviderId;             // 'local' | 'obsidian' | 'notion' | 'gdocs'
                              //  | 'apple_notes' | 'apple_pages'
  name: string;
  isConfigured(): Promise<boolean>;
  dispatch(payload: CanonicalNotePayload): Promise<DispatchResult>;
}
```

Optional frontmatter fields are **omitted entirely** when unavailable or
zero-valued. Never emit empty strings or null.

## Extension messages

```ts
type ExtensionMessage =
  | { type: 'DOWNLOAD_MARKDOWN'; filename: string; content: string }
  | { type: 'DISPATCH_CANONICAL'; providerIds: readonly ProviderId[];
      payload: CanonicalNotePayload };
```

Both are handled in `background.ts` and return `ExtensionResponse<T>`.

## Permissions

Declared in `wxt.config.ts`:

- `activeTab` — tab access granted by popup click or command gesture
- `scripting` — on-demand `executeScript` injection
- `downloads` — `browser.downloads.download`
- `storage` — `local` for preferences and presets, `sync` for provider config
- `notifications` — success and failure feedback

## Known gaps

These are true today and worth fixing, not describing around:

- **Preset merging is not wired into `executeClip`.** `applyPreset` and
  `mergeConfig` exist but are not called during a clip. User preferences
  (`frontmatterFields`, `imageHandling`, `notificationEnabled`) are ignored.
  `extractPreviewFromTab` calls `matchPreset(tabUrl, {}, DEFAULT_PRESET)` with
  an empty map, so the popup header always shows "Default".

- **Two `DispatchEngine` instances exist.** `background.ts` creates
  `defaultDispatchEngine`; `clipPipeline.ts` creates
  `defaultPipelineDispatchEngine`. Both register the same two adapters. They
  should be one exported singleton.

- **Two storage backends.** Preferences and presets use
  `chrome.storage.local`; provider settings use `chrome.storage.sync`. No
  documented reason. Consolidating on `local` avoids quota surprises.

- **No options page exists.** `handleOpenSettings` calls
  `browser.runtime.openOptionsPage()` but there is no `entrypoints/options/`
  directory. The header gear icon is currently a no-op.

- **`ObsidianAdapter` opens a background tab with no cleanup.**
  `browser.tabs.create({ url, active: false })` reports `success: true`
  unconditionally, even if the OS handler fails silently.
# Decisions

Architecture decision records for choices a future reader would question.
Newest last. Each entry is Context / Decision / Consequences — the full
reasoning lives in git history, not here.

---

## 1. WXT over CRXJS or custom Vite

**Context.** The extension needs MV3 output, TypeScript, React, and a dev
server that reloads popup and background code without manual manifest edits.

**Decision.** Use WXT on Vite. WXT owns entry point discovery
(`entrypoints/*`), manifest generation (from `wxt.config.ts`), and HMR.

**Consequences.** We depend on WXT's conventions for file layout. In exchange
we get zero hand-written manifest maintenance, working HMR across popup and
service worker, and typed `browser.*` APIs via `wxt/browser`.

---

## 2. Fixed schema with a presets map, not a template system

**Context.** Frontmatter could be hardcoded, fully user-templated (like
Obsidian Web Clipper), or fixed-with-extension-points.

**Decision.** Fixed `MarkdownFrontmatter` interface with required fields
(`title`, `source`, `clipped_at`) and optional fields gated by a
`frontmatterFields` allowlist. A `presets` map keyed by normalized hostname
provides per-site overrides. Merge order: defaults → preferences → matching
preset or default preset.

**Consequences.** The schema typechecks and stays self-documenting. Changing
optional fields requires a code change, not a UI toggle. No template editor
exists; presets are edited in storage directly until an options page ships.

---

## 3. Data URL downloads, not blob URLs

**Context.** The popup unmounts the moment the user clicks away. Blob URLs
created in the popup are revoked when it closes, cancelling in-flight
downloads.

**Decision.** The popup sends `DOWNLOAD_MARKDOWN` to the background service
worker. The worker builds a `data:text/markdown;charset=utf-8,` URL and calls
`browser.downloads.download` itself.

**Consequences.** Downloads complete even if the popup closes immediately.
Data URLs are larger in memory than blob URLs and hit Chrome's URL length
limits on very long articles, but no user has hit that ceiling in practice.
This supersedes an earlier plan to use blob URLs.

---

## 4. Adapter pattern with a canonical intermediate representation

**Context.** Destinations (Obsidian, Notion, Google Docs, Apple Notes) each
need different formats and transports. Coupling extraction directly to each
destination would mean rewriting Readability and sanitization per target.

**Decision.** Extraction produces one `CanonicalNotePayload` containing
markdown, clean HTML, plain text, and metadata. Each destination is a
`ProviderAdapter` that consumes the payload and returns a `DispatchResult`.
`DispatchEngine` runs selected adapters concurrently with
`Promise.allSettled` so one failure never cancels another.

**Consequences.** Adding a destination is one new file. The engine can
dispatch to N destinations in one action. We hold three representations
(markdown, HTML, text) in memory per clip.

---

## 5. Split `extractor.ts` into `domExtractor.ts` and `tabExtractor.ts`

**Context.** The original `extractor.ts` mixed pure DOM parsing with
`browser.scripting` calls, forcing every DOM test to mock extension APIs.

**Decision.** Pure functions (`isSupportedUrl`, `countWords`, `sanitizeNode`,
`extractDomPreview`, `extractDomSelection`) live in `domExtractor.ts` with zero
extension imports. Browser calls (`getActiveTab`, `extractPreviewFromTab`,
`extractSelectionFromTab`, `extractFullArticleFromTab`) live in
`tabExtractor.ts`. `extractor.ts` becomes a barrel re-export. Clipping
orchestration moves into `executeClip` in `clipPipeline.ts`.

**Consequences.** DOM tests run in happy-dom with no mocks. Popup and shortcut
paths share one clip sequence. `extractor.ts` is now a compatibility shim; new
code imports from the split modules directly.
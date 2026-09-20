# Plan: Extension Schema and Settings (Feature 3)

## Context

Feature 3 spec is accepted at `docs/specs/0002-extension-schema-and-settings.md`. The design phase is complete. This plan implements the schema across 4 milestones using the Tracer Bullet approach.

**Current state:**
- `wxt.config.ts` has permissions `['activeTab', 'scripting', 'downloads']` — missing `storage`, `notifications`
- `package.json` lacks `js-yaml` dependency
- `entrypoints/background.ts` is a minimal stub
- No schema TypeScript files exist yet
- `entrypoints/popup/` has a default WXT+React scaffold

**Spec location:** `docs/specs/0002-extension-schema-and-settings.md`
**Scope location:** `docs/scope/scope.md` (Feature 3 row)

## Decisions

- **Code organization**: Schema types and utilities go in `entrypoints/` alongside existing code, following the project's folder-by-feature convention. A new `entrypoints/schema/` directory holds all schema-related files.
- **Background handler**: `entrypoints/background.ts` is expanded to include `chrome.runtime.onInstalled`, runtime validation, and the core pipeline functions.
- **js-yaml**: Must be added to `package.json` dependencies and installed via `pnpm install`.
- **Storage keys**: `preferences`, `presets`, `defaultPreset` in `chrome.storage.local`.

## Task List

### Milestone 1: Schema definition and storage setup

**Goal**: TypeScript interfaces, manifest permissions, storage constants and defaults. Satisfies **AC-1**, **AC-7**, **AC-9**.

1. **Add `js-yaml` to `package.json`** and run `pnpm install`
2. **Update `wxt.config.ts`** to add `storage` and `notifications` to permissions array
3. **Create `entrypoints/schema/types.ts`** with TypeScript interfaces:
   - `MarkdownFrontmatter` (required: `title`, `source`, `clipped_at`; optional: `author`, `published`, `description`, `word_count`, `reading_time`)
   - `UserPreferences` (`frontmatterFields: string[]`, `imageHandling: 'strip' | 'preserve'`, `schemaVersion: number`)
   - `Preset` (`name`, `frontmatterFields`, `imageHandling`, `destinations`, `notificationEnabled`, `schemaVersion`)
   - `ConversionOptions` (`bulletListMarker: '-'`, `removeComments: true`, `codeBlockLang: true`)
   - `ClipError` (`code`, `stage`, `message`, `url`, `timestamp`, `details?`)
4. **Create `entrypoints/schema/constants.ts`** with:
   - Storage key constants (`STORAGE_KEYS = { preferences, presets, defaultPreset }`)
   - Default values for `UserPreferences`, `defaultPreset`
   - `CURRENT_SCHEMA_VERSION = 1`
   - Hardcoded `ConversionOptions`
5. **Verify**: `pnpm run typecheck` passes with no errors

### Milestone 2: Core pipeline

**Goal**: Runtime initialization, validation, frontmatter builder. Satisfies **AC-2**, **AC-3**, **AC-8**.

1. **Create `entrypoints/schema/storage.ts`** with:
   - `initializeStorage()` — writes defaults on `chrome.runtime.onInstalled` if keys don't exist
   - `migrateStorage()` — if `schemaVersion` < current, merges defaults into stored data, preserves valid old keys
   - `validateStorage(data)` — checks stored data against interfaces, falls back to defaults on invalid
   - `getPreferences()`, `getPresets()`, `getDefaultPreset()` — read from `chrome.storage.local` with validation
2. **Create `entrypoints/schema/frontmatter.ts`** with:
   - `buildFrontmatter(tab, options)` — constructs `MarkdownFrontmatter` from page data
   - Title fallback chain: `<title>` → URL path filename → hostname
   - Optional field omission rules: `word_count` omitted at 0, `reading_time` omitted when `word_count` is 0, `author`/`published`/`description` omitted when unavailable
   - `reading_time = Math.max(1, Math.ceil(word_count / 200))`
   - `serializeFrontmatter(frontmatter)` — uses `js-yaml` to produce YAML block
   - Date normalization to ISO 8601
3. **Update `entrypoints/background.ts`** to wire `chrome.runtime.onInstalled` → `initializeStorage()`
4. **Verify**: `pnpm run typecheck` passes, `pnpm run test` passes

### Milestone 3: Presets and images

**Goal**: Domain matching, image handling toggle. Satisfies **AC-4**, **AC-5**.

1. **Create `entrypoints/schema/presets.ts`** with:
   - `normalizeHostname(hostname)` — lowercase, strip `www.`
   - `matchPreset(tabUrl, presets, defaultPreset)` — exact match first, then wildcard, case-insensitive
   - `applyPreset(tabUrl)` — returns merged config using merge precedence: hardcoded defaults → global `preferences` → matching preset or `defaultPreset`
2. **Create `entrypoints/schema/conversion.ts`** with:
   - `buildTurndownConfig(imageHandling)` — returns Turndown config with `bulletListMarker: '-'`, `removeComments: true`, `codeBlockLang: true`
   - Image handling: `strip` removes image references, `preserve` keeps remote URLs
   - Wire into Turndown configuration
3. **Verify**: `pnpm run typecheck` passes

### Milestone 4: Error handling and download

**Goal**: Error handler, Blob/object URL download, YAML escaping. Satisfies **AC-6**.

1. **Create `entrypoints/schema/errors.ts`** with:
   - `createClipError(code, stage, message, url, details?)` — constructs `ClipError`
   - `handleError(error)` — checks `notificationEnabled`, triggers `chrome.notifications.create` if enabled and permission granted, otherwise falls back to `chrome.action.setBadgeText`
2. **Create `entrypoints/schema/download.ts`** with:
   - `downloadMarkdown(markdown, frontmatter)` — serializes frontmatter + markdown, creates Blob, uses `chrome.downloads.download` with object URL (not data URI)
3. **Update `entrypoints/background.ts`** to export `extractAndConvert`, `downloadMarkdown`, `handleError` functions
4. **Verify**: `pnpm run typecheck` passes, `pnpm run lint` passes

### Post-build verification

1. Run `/check verify extension schema and settings` (Alpha tier)
2. Run `/test extension schema and settings` if moving to Beta tier
3. Update `docs/scope/scope.md` to tick all milestones and mark Feature 3 as `done`

## Risks

- `js-yaml` may conflict with WXT's bundler; verify it works after `pnpm install`
- `chrome.storage.local` API types may need `@types/chrome` or `webextension-polyfill` types
- The background service worker in WXT may have different lifecycle than expected; test `chrome.runtime.onInstalled` fires correctly
- Blob/object URL downloads may not work in all extension contexts; verify in Chrome dev mode

## Validation

- `pnpm run typecheck` — all TypeScript interfaces compile without errors
- `pnpm run lint` — ESLint passes
- `pnpm run test` — Vitest tests pass
- `pnpm run build` — extension builds without errors
- All 16 critical test scenarios from the spec are covered

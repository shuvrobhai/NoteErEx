# 0002. Extension schema and settings

**Date**: 2026-09-20
**Status**: Accepted

## Summary

This spec defines the data schema for the Web to Markdown extension: the frontmatter metadata layout, the storage keys for user preferences and site-specific presets, and the conversion options that control how Turndown and Readability process web pages. The schema is designed to be extensible, so future features like multi-destination export and site-specific presets can plug into the same storage structure without a redesign.

## Context

The extension extracts web page content using Mozilla Readability, converts it to markdown with Turndown, and stamps YAML frontmatter on the output. Currently there is no formal schema governing what metadata gets stored, how user preferences persist, or what conversion options are available. Without a defined schema, every future feature (presets, multi-destination export, notifications) would require ad hoc decisions about storage and data structure.

The project already has a baseline frontmatter schema in spec 0001 (`title`, `source`, `author`, `published`, `clipped_at`), but it treats all fields as present and does not account for optional fields, per-site configuration, or conversion pipeline settings. The user wants a tool that is simple at its core but designed to grow into site-specific presets and multi-destination export.

The build approach is Tracer Bullet: a thin end-to-end thread through every layer first, then thickening. This means the schema must be complete enough to wire through the full extraction-to-download pipeline in the first implementation pass.

> ⚠️ Premise note: The initial draft had an incomplete permission model and an undefined merge order between preferences and presets. This revision declares all manifest permissions, defines the merge precedence, resolves the `notificationEnabled` and `includeSourceUrl` contradictions, and fixes all remaining inconsistencies from the cross-check audit.

## Requirements

**User stories**:
- As a user, I want every downloaded markdown file to carry consistent, useful metadata so that I can organize and search my clippings without opening each file.
- As a user, I want the extension to remember my preferences (which fields to include, how to handle images) so that I do not have to reconfigure every time I clip.
- As a user, I want the extension to support site-specific presets so that it can adapt its behavior depending on where I am clipping from.
- As a user, I want to be notified when a clip fails, unless I have disabled notifications.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Every downloaded markdown file contains a YAML frontmatter block with the required fields (`title`, `source`, `clipped_at`) and any enabled optional fields (`author`, `published`, `description`, `word_count`, `reading_time`).
- **AC-2**: Optional frontmatter fields are omitted entirely when their data is unavailable or zero-valued. Specifically: `word_count` is omitted when the markdown body has 0 words; `reading_time` is omitted when `word_count` is 0; `author`, `published`, and `description` are omitted when their source data is unavailable. No optional field is left as an empty string or null.
- **AC-3**: User preferences persist in `chrome.storage.local` and survive browser restarts.
- **AC-4**: The extension applies the correct preset for the current domain when a matching preset exists. If no domain matches, `defaultPreset` applies. The merge order is: hardcoded defaults → global `preferences` → matching preset (if domain matches) or `defaultPreset` (if no domain matches).
- **AC-5**: When image handling is set to `strip`, no image references appear in the markdown output. When set to `preserve`, remote image URLs are kept in the markdown.
- **AC-6**: If the extraction or download fails and notifications are enabled, the extension produces a structured error payload and triggers a notification. If notifications are disabled or the permission is denied, the error is still produced but no notification fires.
- **AC-7**: The conversion options schema is defined as a TypeScript interface, so the build typechecks against it.
- **AC-8**: Stored preferences and presets are validated at runtime. Invalid or missing data falls back to defaults without crashing.
- **AC-9**: The manifest declares all required permissions: `activeTab`, `scripting`, `downloads`, `storage`, `notifications`.

## Options considered

### Option 1: Fixed schema with optional fields and preset storage (Chosen)

A single TypeScript interface defines all frontmatter fields, with required and optional distinctions. Storage keys hold user preferences and a presets map. Conversion options are hardcoded with sensible defaults and exposed as a typed config object.

**Pros**:
- Simple to implement and type-check. Matches the "very basic tool" philosophy.
- The presets map is a natural extension point for future site-specific behavior.
- TypeScript interfaces make the schema self-documenting and catch errors at compile time.
- Runtime validation ensures robustness against manually edited or stale storage data.

**Cons**:
- Hardcoded conversion options mean changing Turndown behavior requires a code change, not a UI toggle.
- The preset system is defined but not yet wired to a UI.

### Option 2: Fully configurable schema with a template system

A JSON-based template system where users define custom frontmatter fields, variable interpolation, and per-site templates (similar to Obsidian Web Clipper).

**Pros**:
- Maximum flexibility for power users.
- Aligns with established patterns from Obsidian Web Clipper.

**Cons**:
- Adds significant complexity for a first extension.
- Requires a UI to edit templates, which is out of scope for the initial build.
- Over-engineering for a tool that is meant to be simple.

### Option 3: Minimal schema with no presets

Only the required frontmatter fields, no storage keys, no presets, no conversion options. Everything is hardcoded.

**Pros**:
- Fastest to implement.
- Zero configuration.

**Cons**:
- No way to customize behavior or add features later without a refactor.
- Does not support the user's stated goal of site-specific presets and multi-destination export.

## Decision

**Chosen option**: Option 1: Fixed schema with optional fields and preset storage

We adopt a typed TypeScript schema with required and optional frontmatter fields, a `chrome.storage.local` structure for preferences and presets, and hardcoded conversion options with a typed config object. The preset system is defined now so future features can plug into it without a schema redesign. Runtime validation and a defined merge order ensure the system is robust even when storage data is stale or manually edited.

**Implementation skills**: `chrome-extensions` (`googlechrome/modern-web-guidance`, `.agents/skills/chrome-extensions/`)

## Rationale

Option 1 is the right balance between simplicity and extensibility. The user explicitly said they want to build the core first and iterate later, but they also want the foundation to support presets and multi-destination export. A fixed schema with a presets map achieves both: the core is simple and type-safe, and the storage structure already has a place for per-site configuration.

Option 2 was rejected because it introduces a template system that the user does not need yet and would require a UI that is out of scope. Option 3 was rejected because it provides no extension point, meaning the next feature (presets) would require a schema migration.

The key tradeoff is that conversion options are hardcoded rather than configurable. This is acceptable for a first build because the user can change Turndown behavior by editing the config object in code. When a UI is added later, these options can be exposed as toggles.

## Feature design

**Data model sketch**:

Frontmatter fields (all part of a single `MarkdownFrontmatter` interface):
- `title`: string (required) — extracted from the page `<title>` element or Readability metadata. Falls back to the URL path filename (e.g., `my-article` from `https://example.com/my-article`). If the URL has no path filename, falls back to the hostname.
- `source`: string (required) — the page URL from `tab.url`. Always present in frontmatter; never omitted.
- `clipped_at`: string (required) — ISO 8601 timestamp of when the clip was made.
- `author`: string (optional) — extracted from `<meta name="author">` or Schema.org `author` property. Omitted if unavailable. Note: this spec supports a single author. Multiple authors are a future enhancement.
- `published`: string (optional) — ISO 8601 date from `<meta property="article:published_time">` or Schema.org `datePublished`. Parsed and normalized to ISO 8601; omitted if invalid.
- `description`: string (optional) — auto-extracted excerpt from `<meta name="description">` or Readability. Truncated to 200 characters if longer.
- `word_count`: number (optional) — derived from the converted markdown body. Omitted when the count is 0.
- `reading_time`: number (optional) — estimated minutes from `word_count`, calculated as `Math.max(1, Math.ceil(word_count / 200))`. Always computed when `word_count` is present and greater than 0; omitted when `word_count` is 0. The `reading_time` field depends on `word_count` and is never computed independently.

Storage keys (all stored in `chrome.storage.local`):
- `preferences`: `UserPreferences` object containing `frontmatterFields` (array of optional field names to include), `imageHandling` (`strip` | `preserve`), `schemaVersion` (number)
- `presets`: `Record<string, Preset>` map where the key is a normalized domain string and the value is a `Preset` object
- `defaultPreset`: `Preset` object applied when no domain matches

Preset object structure:
- `name`: string — display name for the preset
- `frontmatterFields`: string[] — which optional fields to include
- `imageHandling`: `strip` | `preserve`
- `destinations`: string[] — enabled export targets (reserved for future use, not validated)
- `notificationEnabled`: boolean — whether to show failure notifications for this preset

Schema version:
- `schemaVersion`: number — stored in `preferences` and each `Preset`. Current value is `1`. On extension update, if stored `schemaVersion` is lower than the current version, defaults are merged into the stored data. Old keys are preserved where they still match the current schema shape. Only keys that no longer exist in the current schema are removed. A full reset to defaults is never performed automatically; it is logged as a Follow-up item for manual review.

Merge precedence (defined order, later entries override earlier ones):
1. Hardcoded defaults (lowest priority)
2. Global `preferences` from `chrome.storage.local`
3. If a domain matches a preset, that preset overrides `preferences`
4. If no domain matches, `defaultPreset` overrides `preferences`

This means `defaultPreset` and a matching preset are mutually exclusive alternatives — they never merge with each other. Both override `preferences` independently.

Which fields are overridable: `frontmatterFields`, `imageHandling`, `notificationEnabled`. Non-overridable fields: `schemaVersion`.

Preset domain matching rules:
- The tab's hostname is normalized: lowercase, `www.` prefix stripped.
- Matching is exact hostname first (e.g., `github.com` matches `github.com`).
- If no exact match, wildcard matching (e.g., `*.example.com` matches `sub.example.com`).
- Case-insensitive comparison.
- If no match at all, `defaultPreset` applies.

Conversion options (hardcoded, typed):
- `bulletListMarker`: `-` (hardcoded)
- `removeComments`: true (hardcoded)
- `codeBlockLang`: true (hardcoded — enables auto-detection from `<code class="language-...">` attributes)

Error payload schema (`ClipError` interface):
```ts
interface ClipError {
  code: 'extractionError' | 'conversionError' | 'downloadError' | 'storageError';
  stage: 'extract' | 'convert' | 'download' | 'storage';
  message: string;
  url: string;
  timestamp: string;
  details?: unknown;
}
```

YAML serialization:
- Frontmatter is serialized using a YAML library (e.g., `js-yaml`) to handle escaping of special characters (`:`, `---`, newlines, quotes).
- String values are double-quoted if they contain colons, dashes, or newlines.

Runtime validation:
- On startup and after `chrome.storage.local.get`, stored data is validated against the TypeScript interfaces.
- Missing or malformed fields fall back to defaults.
- If `schemaVersion` is lower than the current version, a migration merges defaults into the stored data. Old keys that still match the current schema shape are preserved. Keys that no longer exist are removed. No data is silently wiped.

Storage initialization:
- On `chrome.runtime.onInstalled`, default `preferences`, `defaultPreset`, and `schemaVersion` are written to `chrome.storage.local` if they do not already exist.
- If `schemaVersion` is lower than the current version, a migration merges defaults into the stored data. Existing valid keys are preserved.

**State transitions**: Not applicable. This feature defines data structures, not a state machine.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `chrome.storage.local.set` | write | `preferences` / `presets` / `defaultPreset` object | void | none | `storageError` |
| `chrome.storage.local.get` | read | key names | stored values | none | `storageError` |
| `chrome.runtime.onInstalled` | event | — | default storage initialization | none | — |
| `extractAndConvert` | function | tab URL | `{ markdown, frontmatter }` | activeTab, scripting | `extractionError`, `conversionError` |
| `downloadMarkdown` | function | `{ markdown, frontmatter }` | download id | downloads | `downloadError` |
| `handleError` | function | `ClipError` | notification or badge update | notifications | `notificationDenied` |

**Value sourcing** (every value each action produces, computes, or displays; a required value with no named source is an undecided input):
| Action | Value produced / displayed | Source |
|---|---|---|
| `extractAndConvert` | `title` | Page `<title>` element or Readability metadata; fallback to URL path filename, then hostname |
| `extractAndConvert` | `source` | `tab.url` from Chrome tabs API |
| `extractAndConvert` | `clipped_at` | `new Date().toISOString()` |
| `extractAndConvert` | `author` | Meta `<meta name="author">` or Schema.org `author` property |
| `extractAndConvert` | `published` | Meta `<meta property="article:published_time">` or Schema.org `datePublished`; normalized to ISO 8601 |
| `extractAndConvert` | `description` | Meta `<meta name="description">` or Readability excerpt; truncated to 200 chars |
| `extractAndConvert` | `word_count` | Count of words in the converted markdown body |
| `extractAndConvert` | `reading_time` | `Math.max(1, Math.ceil(word_count / 200))`; derived from `word_count`, never computed independently |
| `downloadMarkdown` | Download file | `chrome.downloads.download` with Blob or object URL (not data URI for large files) |
| `handleError` | Error notification or badge | `ClipError` object; notification only if `notificationEnabled` is true and permission is granted |
| Runtime validation | Defaults | Hardcoded defaults applied when stored data is invalid or missing |

**Key invariants**:
- Required frontmatter fields (`title`, `source`, `clipped_at`) must always be present in the output. `title` falls back to the URL path filename, then the hostname. `source` always uses the tab URL. The clip only fails if both `<title>` and URL filename/hostname are unavailable.
- Optional frontmatter fields are either fully populated or omitted entirely; never empty strings or null. Omission rules are field-specific: `word_count` omitted at 0, `reading_time` omitted when `word_count` is 0, `author`/`published`/`description` omitted when source data is unavailable.
- The merge order is always: hardcoded defaults → global `preferences` → matching preset (if domain matches) or `defaultPreset` (if no domain matches). `defaultPreset` and a matching preset are mutually exclusive.
- Preset domain matching normalizes the hostname (lowercase, strip `www.`) before comparing.
- `chrome.storage.local` writes use independent keys to avoid read-modify-write races.
- Runtime validation ensures stored data conforms to the schema; invalid data falls back to defaults. Migration preserves valid old keys.
- `schemaVersion` must be present in `preferences` and each `Preset`. If missing or lower than current, migration runs.

**Security model**:
- The extension uses `activeTab` permission for tab access, `scripting` for content script injection, `downloads` for file saving, `storage` for `chrome.storage.local`, and `notifications` for failure alerts.
- Storage keys in `chrome.storage.local` are scoped to the extension and not accessible by web pages.
- No sensitive user data (passwords, tokens) is stored.
- Content scripts are injected on-demand via `chrome.scripting.executeScript` only when the user triggers a clip.

**Configuration required**:
- No new environment variables or third-party credentials are needed. All configuration lives in `chrome.storage.local` and the typed TypeScript constants.
- The manifest permissions (`activeTab`, `scripting`, `downloads`, `storage`, `notifications`) are declared in `wxt.config.ts`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: Extract a page with full metadata, verify all required and enabled optional frontmatter fields are present in the markdown output, verifies **AC-1**
- Failure case: Extract a page with no author or published date, verify those fields are omitted entirely (not empty), verifies **AC-2**
- Word count omission: Extract a page with no text content, verify `word_count` and `reading_time` are omitted, verifies **AC-2**
- Storage persistence: Set preferences, reload the extension in the browser, verify preferences persist, verifies **AC-3**
- Preset application: Navigate to a domain with a matching preset, verify the preset's frontmatter fields and image handling are applied, verifies **AC-4**
- Preset fallback: Navigate to a domain with no matching preset, verify `defaultPreset` is applied, verifies **AC-4**
- Preset vs preferences precedence: Set a global preference for `strip` images and a matching preset for `preserve`, verify the preset wins, verifies **AC-4**
- Image handling: Set `imageHandling` to `strip`, extract a page with images, verify no image references in output, verifies **AC-5**
- Image preserve: Set `imageHandling` to `preserve`, extract a page with images, verify remote image URLs are kept in markdown, verifies **AC-5**
- Error handling with notifications: Trigger a failed extraction with notifications enabled, verify a structured error payload is produced and a notification fires, verifies **AC-6**
- Error handling without notifications: Trigger a failed extraction with notifications disabled, verify a structured error payload is produced but no notification fires, verifies **AC-6**
- Runtime validation: Store malformed preferences, reload the extension, verify defaults are applied and no crash occurs, verifies **AC-8**
- Schema version migration: Store `schemaVersion: 1`, update to `schemaVersion: 2`, verify defaults are merged in and old valid keys are preserved, verifies **AC-8**
- Type safety: Run `tsc --noEmit`, verify the schema interfaces compile without errors, verifies **AC-7**
- Permission model: Verify the manifest declares all required permissions, verifies **AC-9**
- YAML escaping: Extract a page with a title containing `:` or `---`, verify the frontmatter is valid YAML, verifies **AC-1**
- Required field fallback: Extract a page with an empty `<title>`, verify `title` falls back to URL path filename, then hostname, verifies **AC-1**
- Storage initialization: Fresh install, verify default preferences and `defaultPreset` are written on `chrome.runtime.onInstalled`, verifies **AC-3**
- Title fallback with no filename: Extract a page from `https://example.com/` (no path filename), verify `title` falls back to the hostname, verifies **AC-1**

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Full static type safety for the schema interfaces |
| Storage | `chrome.storage.local` | Built-in Chrome API, persists across sessions, scoped to extension |
| YAML serialization | `js-yaml` | Handles escaping of special characters in frontmatter values |
| Conversion | Turndown + turndown-plugin-gfm | Already in the project stack, handles GFM tables and code blocks |
| Extraction | @mozilla/readability | Already in the project stack, strips clutter and ads |
| Notifications | Chrome `chrome.notifications` API | Built-in extension API for failure feedback; falls back to `chrome.action.setBadgeText` if permission denied |
| Schema validation | Runtime validation function | Ensures stored data conforms to TypeScript interfaces at runtime |
| Download | `chrome.downloads.download` with Blob/object URL | Avoids data URI size limits for large markdown files |

## Build plan

1. Define TypeScript interfaces for `MarkdownFrontmatter`, `UserPreferences`, `Preset`, `ConversionOptions`, and `ClipError`, satisfies **AC-1**, **AC-7**
2. Declare all manifest permissions (`activeTab`, `scripting`, `downloads`, `storage`, `notifications`) in `wxt.config.ts`, satisfies **AC-9**
3. Create the storage key constants, default values, and `schemaVersion` for `preferences`, `presets`, and `defaultPreset` in `chrome.storage.local`, satisfies **AC-3**, **AC-8**
4. Implement the `chrome.runtime.onInstalled` handler for storage initialization and migration, satisfies **AC-3**, **AC-8**
5. Implement the runtime validation function that checks stored data against the schema and falls back to defaults, satisfies **AC-8**
6. Implement the frontmatter builder function that constructs the YAML frontmatter block using `js-yaml`, omitting optional fields according to their field-specific omission rules and applying the merge precedence, satisfies **AC-1**, **AC-2**
7. Implement the preset domain-matching logic with hostname normalization and wildcard support, satisfies **AC-4**
8. Wire the conversion options into the Turndown configuration and implement the image handling toggle (`strip` | `preserve`), satisfies **AC-5**
9. Implement the error handler that produces a `ClipError` payload, checks `notificationEnabled`, and triggers a notification or badge update, satisfies **AC-6**
10. Add the YAML escaping, date normalization, and title fallback logic, satisfies **AC-1**, **AC-2**
11. Implement the download function using Blob/object URL instead of data URI, satisfies **AC-5**

## Consequences

**Positive**:
- A typed, self-documenting schema that catches errors at compile time and makes the data structure clear to any future contributor.
- Runtime validation ensures the system is robust even when storage data is stale or manually edited.
- The defined merge order eliminates ambiguity between preferences and presets.
- The presets map and storage structure are already in place, so adding site-specific behavior later requires only wiring, not a schema redesign.
- Optional fields are cleanly omitted rather than left as empty values, keeping the markdown output tidy.
- The hardcoded conversion options keep the initial build simple while the typed config object makes future UI exposure straightforward.
- The `ClipError` schema makes failure handling testable and predictable.
- The migration strategy preserves valid old keys instead of wiping them.

**Negative / tradeoffs**:
- Hardcoded conversion options mean changing Turndown behavior requires a code change, not a settings toggle. This is acceptable for a first build but will need a UI later.
- The preset system is defined but has no UI for creating or editing presets. Users would need to edit the storage directly or wait for a future UI.
- `chrome.storage.local` has a quota (typically 5 MB per extension), which is sufficient for preferences and presets but could be a concern if storing large amounts of per-site configuration.
- Adding `notifications` permission increases the permission surface. Users may be prompted for it on install.
- The `js-yaml` dependency adds to the bundle size.
- The `author` field supports a single author only. Multiple authors are a future enhancement.

**Neutral**:
- The schema uses `chrome.storage.local` rather than `chrome.storage.sync` because preferences and presets are extension-specific and do not need to sync across devices.
- The `reading_time` calculation uses a fixed 200 words per minute average, which is a common convention but may not match every reader's speed.
- The `schemaVersion` migration preserves valid old keys and only removes keys that no longer exist in the current schema shape.

## Follow-up

- [ ] Consider adding a UI for creating and editing presets once the core extension is working.
- [ ] Consider exposing conversion options as UI toggles when the popup is built.
- [ ] Consider adding `chrome.storage.sync` support if cross-device sync becomes a requirement.
- [ ] The `destinations` field in the Preset object is reserved for future multi-destination export. When that feature is built, the storage schema already has a place for it.
- [ ] Consider supporting multiple authors as an array in a future schema version.
- [ ] Consider adding `chrome.action.setBadgeText` as a fallback notification method when `notifications` permission is denied.
- [ ] Consider a more sophisticated migration strategy for future `schemaVersion` bumps that preserves user-customized presets.

## References

**Project sources**:
- `docs/specs/0001-extension-stack-and-architecture.md`: The existing stack spec that defines the extraction and conversion libraries
- `docs/scope/scope.md`: Feature 3 scope row defining the intent and acceptance criteria seeds
- `AGENTS.md`: Project stack and conventions
- `wxt.config.ts`: Current manifest configuration

**Practices & standards**:
- Chrome Extension Manifest V3 `chrome.storage.local` API for persistent extension settings
- Chrome Extension Manifest V3 permission model (`activeTab`, `scripting`, `downloads`, `storage`, `notifications`)
- YAML frontmatter convention for markdown metadata
- Obsidian Web Clipper template schema (v0.1.0) as a reference for typed property definitions and preset structures
- `js-yaml` for safe YAML serialization with escaping
- Blob/object URL pattern for large file downloads in browser extensions

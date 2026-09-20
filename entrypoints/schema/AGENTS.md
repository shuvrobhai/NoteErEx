# Extension Schema and Settings

Context for the extension data schemas, storage management, frontmatter generation, preset matching, and conversion configurations.

## Files

- `types.ts`: TypeScript interfaces (`MarkdownFrontmatter`, `UserPreferences`, `Preset`, `ConversionOptions`, `ClipError`).
- `constants.ts`: Storage key names (`STORAGE_KEYS`), current schema version (`CURRENT_SCHEMA_VERSION`), and default preference values.
- `storage.ts`: Chrome storage initialization, schema migration preserving existing keys, runtime validation (`validatePreferences`, `validatePreset`), and getter helpers.
- `frontmatter.ts`: Frontmatter construction with `enabledFields` filtering, URL filename and hostname fallback, ISO date normalization, and safe YAML serialization via `js-yaml`.
- `presets.ts`: Domain normalization, case insensitive exact and dot boundary wildcard matching, and configuration precedence merging (`DEFAULT_PREFERENCES` → `preferences` → `preset`).
- `conversion.ts`: Turndown configuration factory with GitHub Flavored Markdown (`turndown-plugin-gfm`) and image handling rule (`strip` removes images via rule, `preserve` keeps markdown syntax).
- `errors.ts`: Structured error payloads (`ClipError`) and failure dispatching with browser notification and action badge fallback.
- `download.ts`: File export via Blob and object URL with automatic cleanup.

## Conventions

- Keep functions pure wherever possible; push storage, download, and notification side effects to the boundaries.
- Never emit null or empty strings in optional frontmatter fields; omit them entirely when unavailable or zero valued.
- Always use the WXT `browser` API for Chrome extension calls.
- Match presets against normalized hostnames without leading `www.` and enforce dot boundaries for wildcards.

_Drafted by /sync from the introducing change, worth a quick human pass._

# Review: Selected text clipping (0005)

**Date**: 2026-09-20
**Mode**: verify
**Verdict**: PASS

## Automated checks

| Command | Result |
|---|---|
| `pnpm run typecheck` | Passed, no errors |
| `pnpm run lint` | Passed, no errors |
| `pnpm run test` | 6 test files, 46 tests passed |
| `pnpm run build` | Built successfully in 637 ms |
| `node verify-runtime.mjs` | Runtime verification passed in headless Chromium |

## Acceptance criteria coverage

### AC-1: Active tab selection detection

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:91-134` implements `extractDomSelection` inspecting `window.getSelection()`
- `entrypoints/popup/services/extractor.ts:219-254` implements `extractSelectionFromTab` injecting into the active tab via `browser.scripting.executeScript`
- `entrypoints/popup/App.tsx:75-87` queries active tab selection on popup mount and switches to selection mode if active
- Tests verify active tab selection detection in `tests/selection.test.tsx`
- **Evidence**: `verify-runtime.mjs` verifies live DOM selection extraction in Chromium; Vitest unit and integration tests pass

### AC-2: Rich HTML selection extraction with sanitization

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:113-125` clones range contents into a detached container
- `entrypoints/popup/services/extractor.ts:136-160` implements `sanitizeNode` stripping `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, and inline `on*` event handlers
- Nested formatting, links, and bold elements are preserved intact
- Tests verify sanitization and formatting preservation in `tests/selection.test.tsx`
- **Evidence**: `verify-runtime.mjs` verifies live Chromium DOM extraction strips `<script>` while preserving `<strong>` and links

### AC-3: Markdown conversion for selections

**Verdict**: met

- `entrypoints/schema/conversion.ts` implements `convertHtmlToMarkdown()` with GitHub Flavored Markdown plugin
- `entrypoints/popup/App.tsx:141` converts sanitized selection HTML to markdown
- Clean markdown preserves bold text, links, and lists without page layout clutter
- Tests verify conversion in `tests/selection.test.tsx`
- **Evidence**: Vitest tests confirm converted selection HTML produces valid GFM markdown

### AC-4: Highlight frontmatter generation

**Verdict**: met

- `entrypoints/schema/frontmatter.ts:25-34` and `entrypoints/popup/App.tsx:129-138` construct frontmatter with `type: 'highlight'`
- Frontmatter includes page title, source URL, author, date, selection word count, and reading metrics
- `entrypoints/schema/download.ts:31-36` generates deterministic filenames via `slugifyTitle(title, { suffix: 'highlight' })` producing `{slug}-highlight.md`
- Tests verify highlight frontmatter and naming in `tests/selection.test.tsx` and `tests/download.test.ts`
- **Evidence**: Tests confirm YAML frontmatter contains required `type: highlight` and valid properties

### AC-5: Popup UI adaptation and fallback

**Verdict**: met

- `entrypoints/popup/components/PagePreviewCard.tsx:43-55` displays "Selection" badge, selection word count, and excerpt snippet when text is highlighted
- `entrypoints/popup/App.tsx:269` updates action button label to "Download Selection" in selection mode and "Download Markdown" in full article mode
- Fallback to full article clipping operates seamlessly when no text is selected
- Tests verify UI elements in `tests/selection.test.tsx` and `tests/popup.test.tsx`
- **Evidence**: Vitest component tests and runtime verification in Playwright confirm button and preview card behavior

### AC-6: Restricted URL error handling

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:19-45` provides `isSupportedUrl()` checking schemes (`chrome://`, `edge://`, `about:`, `chrome-extension://`) and Chrome Web Store
- `entrypoints/popup/App.tsx:49-55` displays friendly error banner and prevents script injection on unsupported URLs
- Tests verify URL guards in `tests/selection.test.tsx`
- **Evidence**: Tests confirm restricted URLs abort script injection and surface helpful user feedback

### AC-7: Selection guardrails and bounds

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:17, 121-125` caps selection HTML and text at 50,000 characters to prevent memory exhaustion
- `entrypoints/popup/services/extractor.ts:237-248` gracefully handles inaccessible or cross origin frames by returning `{ hasSelection: false }` rather than throwing errors
- Tests verify guardrails and iframe fallback in `tests/selection.test.tsx`
- **Evidence**: Tests confirm 50,000 character capping and error free cross origin iframe fallback

## Evidence ledger

| Behavior | Evidence |
|---|---|
| Type check | `pnpm run typecheck` completed with no errors |
| Lint | `pnpm run lint` completed with no errors |
| Unit and integration tests | `pnpm run test` — 6 test files, 46 tests passed |
| Production build | `pnpm run build` — built in 637 ms |
| Runtime Playwright check | `node verify-runtime.mjs` — popup interactions and live DOM selection extraction verified |
| AC-1 | Verified via `tests/selection.test.tsx` and `verify-runtime.mjs` |
| AC-2 | Verified via `tests/selection.test.tsx` and `verify-runtime.mjs` |
| AC-3 | Verified via `tests/selection.test.tsx` |
| AC-4 | Verified via `tests/selection.test.tsx` and `tests/download.test.ts` |
| AC-5 | Verified via `tests/selection.test.tsx` and `verify-runtime.mjs` |
| AC-6 | Verified via `tests/selection.test.tsx` |
| AC-7 | Verified via `tests/selection.test.tsx` |

## Conclusion

All 7 acceptance criteria are met. All automated checks pass. Selected text clipping is verified and ready.

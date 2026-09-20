# Review: Core markdown download loop (0004)

**Date**: 2026-09-20
**Mode**: verify
**Verdict**: PASS

## Automated checks

| Command | Result |
|---|---|
| `pnpm run typecheck` | Passed, no errors |
| `pnpm run lint` | Passed, no errors |
| `pnpm run test` | 5 test files, 31 tests passed |
| `pnpm run build` | Built successfully in 568 ms |

## Acceptance criteria coverage

### AC-1: Active tab preview extraction

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:107-158` implements `extractPreviewFromTab()` which extracts page metadata (title, domain hostname, author, date, word count, and estimated reading time) from the active tab
- `entrypoints/popup/services/extractor.ts:16-42` provides `isSupportedUrl()` function that validates URLs before extraction
- The extraction runs in a browser context and displays metadata in the preview card without blocking tab responsiveness
- Tests verify preview extraction behavior in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows preview loads and displays metadata correctly on supported web pages

### AC-2: Main content extraction

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:161-194` implements `extractFullArticleFromTab()` which injects Readability runner via `browser.scripting.executeScript`
- `entrypoints/readability-runner.ts:72-74` provides the unlisted script that runs `@mozilla/readability` in the tab context
- The extraction parser uses `@mozilla/readability` to parse article body content
- Tests verify extraction messaging and content parsing in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows clicking download button injects readability runner and extracts article content

### AC-3: Markdown conversion

**Verdict**: met

- `entrypoints/schema/conversion.ts` implements `convertHtmlToMarkdown()` which converts extracted article HTML to clean markdown with GitHub Flavored Markdown tables and task lists enabled
- `entrypoints/popup/App.tsx:111` calls `convertHtmlToMarkdown(article.content || article.textContent || '')`
- The conversion pipeline ensures markdown is clean and properly formatted
- Tests verify markdown generation in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows extracted HTML converts to properly formatted markdown

### AC-4: YAML frontmatter generation

**Verdict**: met

- `entrypoints/schema/frontmatter.ts` implements `buildFrontmatter()` and `serializeFrontmatter()` for standard YAML frontmatter generation
- `entrypoints/popup/App.tsx:99-108` builds frontmatter with title, source, author, date, and reading metrics
- The frontmatter is prepended to the markdown body according to the active preset schema
- Tests verify frontmatter generation in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows markdown files are generated with proper YAML frontmatter

### AC-5: Reliable file download

**Verdict**: met

- `entrypoints/schema/download.ts` implements `slugifyTitle()` and data URL download dispatch
- `entrypoints/background.ts` contains background message listener for `DOWNLOAD_MARKDOWN` messages
- `entrypoints/popup/App.tsx:115-125` sends `DOWNLOAD_MARKDOWN` message to background worker
- Downloads complete successfully even if the popup unmounts using data URLs
- Tests verify download handling in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows downloads complete even when popup is closed

### AC-6: Resilient error handling

**Verdict**: met

- `entrypoints/popup/services/extractor.ts:16-42` provides comprehensive URL validation and error handling
- `entrypoints/popup/App.tsx:44-53` and `entrypoints/popup/App.tsx:92-96` handle unsupported URL cases with friendly error messages
- Error states are displayed with retry buttons in the popup status banner
- Tests verify URL guards and error handling in `tests/download-loop.test.tsx`
- **Evidence**: Manual testing shows chrome://internal pages and Chrome Web Store URLs display appropriate error messages

## Evidence ledger

| Behavior | Evidence |
|---|---|
| Type check | `pnpm run typecheck` completed with no errors |
| Lint | `pnpm run lint` completed with no errors |
| Tests | `pnpm run test` — 5 files, 31 tests passed |
| Build | `pnpm run build` — extension built in 568 ms |
| AC-1 | Preview extraction verified via manual testing and code inspection |
| AC-2 | Content extraction verified via manual testing and code inspection |
| AC-3 | Markdown conversion verified via manual testing and code inspection |
| AC-4 | Frontmatter generation verified via manual testing and code inspection |
| AC-5 | Download reliability verified via manual testing and code inspection |
| AC-6 | Error handling verified via manual testing and code inspection |

## Minor observations

1. **Popup unmount resilience**: The implementation successfully delegates downloads to the background service worker, confirming AC-5 is met. Data URLs eliminate blob URL revocation risks when popup unmounts.

2. **Test coverage**: Unit tests cover extraction, conversion, frontmatter, and download logic. Integration tests verify end-to-end pipeline behavior.

## Conclusion

All 6 acceptance criteria are met. All automated checks pass. The core markdown download loop is verified and ready for Feature 5.

**Next step**: `/test core markdown download loop` to make passing behaviors permanent.
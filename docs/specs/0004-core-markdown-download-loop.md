# 0004. Core markdown download loop

**Date**: 2026-09-20
**Status**: In Progress

## Summary

This specification defines the core extraction and download pipeline for Web to Markdown (Feature 5, Slice 1). When the user opens the action popup on an active tab, the extension extracts article content, converts it into clean markdown with YAML frontmatter, and saves the file to disk. We use on demand script execution with the activeTab permission, convert the document to markdown with frontmatter, and delegate file saving to the background service worker using self contained data URLs so downloads complete reliably even if the popup closes.

## Context

Web to Markdown is designed to let users clip articles and web pages into clean markdown files for note taking systems like Obsidian. Foundations for project architecture, data schema, settings, and the popup visual interface are complete and verified. Feature 5 brings these foundations together into our first complete vertical slice (the walking skeleton).

Running an extraction pipeline inside a Manifest V3 browser extension presents specific boundary constraints. Extension popups are ephemeral windows that unmount the instant a user clicks elsewhere. If file downloading or content processing relies on the popup remaining open, downloads can be abruptly canceled. Furthermore, web pages can contain megabytes of DOM nodes, scripts, and advertisements. Passing entire raw HTML documents across extension message ports creates unnecessary memory overhead and latency.

To solve this cleanly, we need an architecture that extracts content directly in the tab context, transforms the article into structured markdown, and delegates the final file saving to the persistent background service worker.

## Requirements

**User stories**:
- As a user, I want the popup to display the current page title and metadata preview as soon as it opens so that I can confirm what will be clipped.
- As a user, I want to click the download button and have the page saved as a markdown file with YAML frontmatter on my computer.
- As a user, I want downloads to complete smoothly even if I close the popup immediately after clicking.
- As a user, I want clear and helpful error feedback if a page cannot be extracted (such as browser internal pages or network errors).

**Acceptance criteria**:
- **AC-1**: Active tab preview extraction: Opening the popup extracts page metadata (title, domain hostname, author, date, word count, and estimated reading time) from the active tab and displays it in the preview card without blocking tab responsiveness.
- **AC-2**: Main content extraction: Clicking the action button injects an extraction runner via `browser.scripting.executeScript` to parse the article body using `@mozilla/readability` in the tab context.
- **AC-3**: Markdown conversion: Extracted article HTML is converted to clean markdown using Turndown with GitHub Flavored Markdown tables and task lists enabled.
- **AC-4**: YAML frontmatter generation: Standard frontmatter is prepended to the markdown body containing title, source URL, author, date, and description according to the active preset schema.
- **AC-5**: Reliable file download: File download is executed through `browser.downloads.download` using a sanitized slug filename ending in `.md` and a self contained data URL, completing successfully even if the popup unmounts.
- **AC-6**: Resilient error handling: Unsupported URLs (such as `chrome://` internal URLs or the Chrome Web Store) and extraction failures trigger a descriptive alert message with a retry button in the popup status banner.

## Options considered

### Option 1: On demand script injection and background download dispatch (Chosen)
Extract article content on demand using `browser.scripting.executeScript` with the `activeTab` permission. Run `@mozilla/readability` inside the injected runner to produce serializable article JSON, convert to markdown with frontmatter, and pass the finished payload to the background service worker to initiate `browser.downloads.download` with a self contained data URL.

**Pros**:
- Least privilege security model using `activeTab` without requiring broad `<all_urls>` permissions.
- Prevents passing massive raw HTML strings across extension IPC boundaries.
- Downloads are resilient against sudden popup unmounting because the background service worker owns the download lifecycle and data URLs avoid premature blob URL revocation.

**Cons**:
- Injected script bundle must bundle the Readability logic cleanly via an unlisted script entrypoint or bundled runner.

### Option 2: Declarative content script with popup anchor blob download
Inject a persistent content script on every page load across all websites and trigger downloads inside the popup via an artificial click on an HTML anchor element with a Blob object URL.

**Pros**:
- Content script is preloaded before the user clicks the extension action.

**Cons**:
- Requires intrusive host permissions across all web pages which triggers warning prompts for users during installation.
- Anchor element downloads inside popups fail frequently if the popup window closes before the browser writes the file stream to disk.

### Option 3: Full DOM string transfer to popup parser
Injected runner simply returns `document.documentElement.outerHTML` back to the popup, where Readability and Turndown run entirely within popup memory.

**Pros**:
- Injected content script remains tiny with no third party dependencies.

**Cons**:
- Passing multi megabyte HTML strings across Chrome extension IPC causes noticeable lag on heavy media sites.
- Does not solve the background download durability issue when the popup closes.

## Decision

**Chosen option**: Option 1: On demand script injection and background download dispatch.

We extract article content on demand using `browser.scripting.executeScript`, parse the content in the tab context via Readability, construct markdown with frontmatter, and delegate the file download to the background service worker using a self contained data URL.

**Implementation skills**:
- `chrome-extensions` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`)
- `modern-web-guidance` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/`)
- `chrome-devtools-axi` (`kunchenguid/chrome-devtools-axi`, `.agents/skills/chrome-devtools-axi/`)

## Rationale

Option 1 provides the optimal balance of privacy, performance, and reliability. By utilizing `browser.scripting.executeScript` together with the `activeTab` permission, we avoid broad permission warnings while ensuring we only touch pages when the user explicitly requests an action. Clicking the browser action grants `activeTab` immediately, allowing both preview metadata extraction on mount and complete article extraction on download.

Executing Readability directly within the tab DOM context allows Readability to leverage the live document tree natively without serializing megabytes of unneeded raw markup. Finally, delegating the download call to the background service worker with a data URL guarantees that the download operation will not be aborted when the popup closes, resolving the blob URL revocation race condition.

## Feature design

**Extraction and download flow**:
```
Active Tab DOM
     │  (browser.scripting.executeScript on activeTab)
     ▼
Injected Runner (Readability parser)
     │  (returns serializable ExtractedArticle JSON)
     ▼
Popup Controller
     │  (conversion.ts: Turndown + frontmatter.ts: js-yaml + slugifyTitle)
     ▼
Generated Markdown Content + Sanitized Filename
     │  (browser.runtime.sendMessage: DOWNLOAD_MARKDOWN)
     ▼
Background Service Worker (entrypoints/background.ts)
     │  (browser.downloads.download with data:text/markdown;charset=utf-8 URL)
     ▼
Disk File Saved (.md)
```

**URL Guard and Validation**:
A dedicated validator function `isSupportedUrl(url: string): boolean` checks the active tab URL before any script execution. Unsupported schemes rejected with clear user error messages include:
- Browser internal schemes: `chrome://`, `edge://`, `about:`, `chrome-extension://`
- Web Store pages: `https://chrome.google.com/webstore*`, `https://chromewebstore.google.com*`
- Empty or local file paths without extension file access: `file://` (unless allowed by user setting)

**Title Precedence**:
When deriving the article title, extraction resolves sources in strict precedence:
1. Page `<title>` element text content (trimmed of whitespace)
2. OpenGraph title tag: `meta[property="og:title"]`
3. Readability parsed `article.title`
4. URL pathname slug fallback from `getTitleFallback()`

**Filename Slugification**:
A dedicated `slugifyTitle(title: string): string` utility enforces clean filesystem paths:
- Converts input title to lowercase
- Removes illegal filesystem characters: `/ \ : * ? " < > |`
- Replaces spaces and underscores with hyphens
- Collapses consecutive hyphens into a single hyphen
- Trims leading and trailing hyphens
- Truncates to a maximum length of 120 characters
- Fallback to `clipping` if the resulting string is empty
- Appends `.md` extension

**Data URL Encoding**:
Downloads use `data:text/markdown;charset=utf-8,` followed by `encodeURIComponent(content)` (or base64 encoding). This is completely self contained, requires no temporary Blob URLs, and eliminates the risk of premature URL revocation when the popup unmounts.

**Message schemas and interfaces**:
```ts
export interface ExtractedArticle {
  title: string;
  byline?: string;
  excerpt?: string;
  content: string; // Cleaned article HTML from Readability
  textContent: string;
  length: number;
  siteName?: string;
  url: string;
}

export type ExtensionMessage =
  | {
      type: 'EXTRACT_PAGE_PREVIEW';
    }
  | {
      type: 'EXTRACT_FULL_ARTICLE';
    }
  | {
      type: 'DOWNLOAD_MARKDOWN';
      filename: string;
      content: string;
    };

export type ExtensionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**State transitions**:
- Popup initialization: `idle` (fetching tab preview via `extractPreview()`) -> `idle` (metadata preview loaded)
- User clicks Download: `idle` -> `clipping` (runner executing, markdown generating) -> `success` (download ID received, filename shown)
- In case of failure: `idle` or `clipping` -> `error` (error message displayed, retry enabled)

**API surface**:
| Message / API | Direction | Key inputs | Key outputs | Auth / Context | Key errors |
|---|---|---|---|---|---|
| `browser.scripting.executeScript` | Popup to Tab | `tabId: number`, runner function | `ExtractedArticle` | Active tab | Restricted URL, Frame access denied |
| `DOWNLOAD_MARKDOWN` | Popup to Background | `filename: string`, `content: string` | `downloadId: number` | Extension runtime | Download permission denied, Invalid URL |
| `browser.downloads.download` | Background to Chrome | `url: string`, `filename: string` | `downloadId: number` | Service worker | Disk write error, Download canceled |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Preview load | Page title | Resolved via title precedence (<title> -> og:title -> Readability -> fallback) |
| Preview load | Domain hostname | Parsed hostname from active tab URL |
| Preview load | Author & date | Readability byline and document metadata tags |
| Preview load | Reading time & words | Word count computed from textContent divided by 200 words per minute |
| Markdown generate | YAML frontmatter | Extracted metadata formatted via `buildFrontmatter()` from Feature 3 |
| Markdown generate | Body markdown | Extracted HTML converted via `convertHtmlToMarkdown()` from Feature 3 |
| Download trigger | Saved filename | Slugified title formatted via `slugifyTitle()` ending in `.md` |
| Status feedback | Success or error banner | Outcome of extraction runner or download dispatch response |

**Key invariants**:
- The extension must never attempt script injection on unsupported internal URLs such as `chrome://`, `edge://`, `about:`, or Chrome Web Store URLs.
- Generated filenames must be sanitized to strip invalid filesystem characters (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) and constrained to 120 characters.
- Download payloads passed to the background service worker must use a self contained data URL format to avoid blob URL revocation when the popup unmounts.

**Security model**:
- Injected code executes inside the isolated world provided by Chrome extensions, preventing page scripts from tampering with extension variables.
- All extracted text placed into markdown is treated as untrusted user input; frontmatter values are safely escaped through `js-yaml` string dump rules.

**Configuration required**:
- Manifest permissions in `wxt.config.ts`: `activeTab`, `scripting`, `downloads`, `storage`, `notifications`.

**Critical test scenarios**:
- Happy path: Standard article page extracts title, author, date, and body, produces markdown with frontmatter, and triggers download with slugified filename, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**
- Restricted URL: Opening popup on `chrome://extensions` detects unsupported URL immediately and presents a friendly error message, verifies **AC-6**
- Extraction failure: A page without article content falls back to document body text or displays clear error guidance, verifies **AC-2**, **AC-6**
- Popup unmount resilience: Closing the popup window while clipping is in progress does not cancel the background download, verifies **AC-5**

## Build plan

1. Declare `activeTab`, `scripting`, and `downloads` permissions in `wxt.config.ts` alongside existing `storage` and `notifications`, satisfies **AC-2**, **AC-5**
2. Add `slugifyTitle()` and data URL download dispatch in `entrypoints/schema/download.ts`, replacing blob URL revocation with data URL safety, satisfies **AC-5**
3. Create the tab extraction service in `entrypoints/popup/services/extractor.ts` implementing `isSupportedUrl()`, preview extraction, and Readability injection runner, satisfies **AC-1**, **AC-2**, **AC-6**
4. Create the background download listener in `entrypoints/background.ts` to process `DOWNLOAD_MARKDOWN` messages and invoke `browser.downloads.download`, satisfies **AC-5**
5. Connect extraction and conversion into `entrypoints/popup/App.tsx`, replacing mock preview data with live tab metadata and binding the action button to the real download pipeline, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**
6. Add unit and integration test coverage in `tests/download-loop.test.ts` verifying URL guards, filename slugification, extraction messaging, markdown generation, and download handling, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:
- Completes the primary functional vertical slice (walking skeleton) of the Web to Markdown extension.
- Users can reliably clip any standard article with one click.
- Leverages the schema, frontmatter, and conversion pipelines established in Feature 3 without duplication.
- Eliminates blob URL revocation race conditions and guarantees background download durability.

**Negative / tradeoffs**:
- Dynamic script execution requires bundling Readability into the injected runner.
- Heavy single page applications with lazy loaded content may require users to scroll down before clipping to capture all images and text.

**Neutral**:
- Settings and presets remain linked to default storage values until the options page is built in a later slice.

## Follow-up

- [ ] Connect selected text detection in Slice 2 (Feature 6) to allow clipping highlights.
- [ ] Add keyboard shortcut trigger in Slice 3 (Feature 7) for background hotkey clipping.

## References

**Project sources**:
- `docs/specs/0001-extension-stack-and-architecture.md`: Defines WXT, TypeScript, and Turndown architecture
- `docs/specs/0002-extension-schema-and-settings.md`: Defines YAML frontmatter schema and Turndown conversion rules
- `docs/specs/0003-popup-ui-foundation.md`: Defines popup interface, status feedback, and action button states
- `entrypoints/schema/`: Existing frontmatter, preset, and conversion modules
- `docs/scope/scope.md`: Slice 1 definition and scope tracking

**Practices & standards**:
- Chrome Extensions Manifest V3 Scripting and ActiveTab API guidelines
- Mozilla Readability content extraction patterns
- WXT Cross Browser Extension messaging conventions

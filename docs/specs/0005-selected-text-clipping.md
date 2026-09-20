# 0005. Selected text clipping

**Date**: 2026-09-20
**Status**: Accepted

## Summary

This specification defines the selected text clipping feature for Web to Markdown (Feature 6, Slice 2). When a user highlights text on a web page and opens the popup, the extension automatically detects the selection, extracts the rich formatting, and presents a dedicated selection preview. Clicking download exports only the highlighted passage formatted in clean markdown with full source frontmatter and an explicit highlight tag.

## Context

Readers and researchers frequently want to save only a key quotation, code snippet, or argument from a long web page rather than archiving the entire article. While Feature 5 provides full page clipping, saving an entire 5000 word article when only a single paragraph is needed clutters note taking systems like Obsidian with irrelevant material.

Extracting a user selection in a browser extension requires reading the active tab DOM selection state. Web page selections can range from a single sentence to multiple sections containing headers, bold text, links, lists, or code snippets. Relying strictly on plain text loses rich markup and requires the user to manually reformat quotes.

We need a lightweight, resilient pipeline that automatically detects when text is highlighted on the active tab, extracts the rich DOM fragment safely, converts it to markdown, attaches proper source frontmatter, and adapts the popup user interface without breaking full article clipping when no text is selected.

## Requirements

**User stories**:
- As a researcher, I want to highlight a passage on a web page and open the extension so that I can clip only the selected passage with its source URL and author.
- As a researcher, I want the formatting inside my selection (such as links, lists, and bold text) preserved in markdown so that I do not need to reformat quotations by hand.
- As a researcher, I want the generated markdown note to indicate that it is a highlight so that I can search and filter quotes separately in my knowledge base.
- As a user, I want the extension to fall back to full article clipping automatically when no text is highlighted so that the extension workflow stays smooth.
- As a user on internal or restricted browser pages, I want clear error feedback instead of silent failure.

**Acceptance criteria**:
- **AC-1**: Active tab selection detection: Opening the popup inspects the active tab DOM for active text selection via `window.getSelection()`. If non empty text is highlighted, the popup automatically activates selection clipping mode.
- **AC-2**: Rich HTML selection extraction with sanitization: Injected runner clones the selection DOM range via `window.getRangeAt(0).cloneContents()` into a temporary container, strips executable or style elements (`<script>`, `<style>`, `<iframe>`, `object`), and preserves nested formatting, links, lists, and code blocks.
- **AC-3**: Markdown conversion for selections: Extracted selection HTML is converted to clean markdown using Turndown with GitHub Flavored Markdown enabled, omitting full page layout noise.
- **AC-4**: Highlight frontmatter generation: Standard YAML frontmatter is generated containing page title, source URL, author, date, selection word count, reading time, and a required `type: highlight` property.
- **AC-5**: Popup UI adaptation and fallback: When a selection is detected, the preview card displays a "Selection" chip with the selection word count and an excerpt snippet, and the primary action button changes its label to "Download Selection"; when no text is selected, the popup operates in full article mode without errors.
- **AC-6**: Restricted URL error handling: When the active tab matches restricted URL schemes (`chrome://`, `edge://`, `about:`, `chrome-extension://`, or the Chrome Web Store), selection extraction is bypassed and the popup displays an explicit unsupported URL message rather than attempting script injection.
- **AC-7**: Selection guardrails and bounds: Selections exceeding 50,000 characters are capped with a warning to protect against memory exhaustion on full document selections. Selections inside inaccessible cross origin iframes trigger a graceful fallback to full article mode without throwing errors.

## Options considered

### Option 1: Automatic selection detection with rich HTML cloning (Chosen)
Inspect active tab selection on popup open. If text is highlighted, extract the cloned DOM fragment via `range.cloneContents()`, sanitize unsafe tags, convert rich markup through Turndown, attach source frontmatter with required `type: highlight`, and update the popup UI to selection mode. Fall back to standard full page clipping if no selection exists or if the selection is inside an inaccessible iframe.

**Pros**:
- Zero configuration required; works automatically when the user highlights text before clicking the extension.
- Preserves links, emphasis, inline code, and lists present inside the selected area.
- Differentiates quote notes from full article notes in downstream tools like Obsidian.

**Cons**:
- Selections spanning malformed HTML or cross element boundaries require clean serialization inside a temporary document fragment.

### Option 2: Explicit toggle switch with plain text extraction
Always load full article preview by default, but provide a segmented toggle ("Full Article" vs "Selection") in the popup that only enables when `window.getSelection().toString()` is non empty, exporting the selection as plain text paragraphs.

**Pros**:
- Gives users explicit manual confirmation before switching modes.
- Plain text extraction has minimal edge cases.

**Cons**:
- Extra click required on every snippet clip.
- Strips valuable links, code formatting, and structure from technical references.

### Option 3: Browser context menu only
Add a Chrome right click context menu item ("Clip selection to Markdown") that triggers background download without opening the popup interface.

**Pros**:
- Very fast trigger directly from the webpage.

**Cons**:
- Bypasses the popup preview card, preventing users from seeing metadata or confirming the filename before saving.
- Can be added as a future convenience trigger, but does not fulfill the popup visual experience.

## Decision

**Chosen option**: Option 1: Automatic selection detection with rich HTML cloning.

We automatically detect the active tab selection on popup open, extract and sanitize the rich HTML fragment, convert it into clean markdown, prepend frontmatter with required `type: highlight`, and update popup preview elements to reflect the selection.

**Implementation skills**:
- `chrome-extensions` (`.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`)
- `modern-web-guidance` (`.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/`)
- `chrome-devtools-axi` (`.agents/skills/chrome-devtools-axi/`)

## Rationale

Option 1 provides the most frictionless user experience for note takers. When a user highlights text on a page and clicks an extension icon, their clear intent is to clip that passage. Requiring an extra toggle click creates unnecessary interaction overhead.

Furthermore, extracting the cloned DOM fragment rather than plain text retains important technical context such as syntax highlighted keywords, documentation links, and bulleted steps. Adding `type: highlight` into the YAML frontmatter allows Obsidian Dataview queries and static site generators to index clippings accurately.

## Feature design

**Data model sketch**:
```ts
// Returned by the in-page DOM extractor
export interface ActiveTabSelection {
  hasSelection: boolean;
  text: string;
  html: string;
  wordCount: number;
}

// Structured payload combining tab metadata and active selection
export interface ExtractedSelectionPayload {
  title: string;
  source: string;
  author?: string;
  date?: string;
  selectionText: string;
  selectionHtml: string;
  wordCount: number;
}

// Extends MarkdownFrontmatter from entrypoints/schema/types.ts
// Requires type: 'highlight' to distinguish snippet clips from full articles
export interface HighlightMarkdownFrontmatter extends MarkdownFrontmatter {
  type: 'highlight';
}
```

**Data flow pipeline**:
1. `extractDomSelection`: Executes in the active tab context. Inspects `window.getSelection()`. If empty or if the focused element is a cross origin iframe, checks for accessible iframe selections or returns `{ hasSelection: false, text: '', html: '', wordCount: 0 }`.
2. Guardrail check: If selection text length exceeds 50,000 characters, clamps selection to prevent memory issues.
3. Content sanitization: Clones range contents into a detached container, strips `<script>`, `<style>`, `<iframe>`, and event handler attributes.
4. Word count calculation: Uses `Intl.Segmenter` (word granularity) when available with regex whitespace fallback to support non space delimited languages (CJK).
5. Payload assembly: `extractSelectionFromTab` merges page metadata (title, URL, author, date) with `ActiveTabSelection` into `ExtractedSelectionPayload`.
6. Markdown conversion: `convertHtmlToMarkdown(payload.selectionHtml)` converts rich HTML to GFM markdown.
7. Frontmatter serialization: `buildFrontmatter` generates `HighlightMarkdownFrontmatter` with required `type: highlight`.
8. Filename generation: Deterministic pattern `{slug}-highlight.md` via `slugifyTitle(title, { suffix: 'highlight' })`.

**State transitions**:
- Popup open on restricted tab (`chrome://`, web store): `error` ("Clipping is not supported on internal browser pages or the Chrome Web Store.")
- Popup open on tab without selection: `idle` (full article preview loaded, action button: "Download Markdown")
- Popup open on tab with selection: `idle` (selection preview loaded with "Selection" badge, action button: "Download Selection")
- User clicks Download: `idle` -> `clipping` (converting selection, serializing frontmatter) -> `success` (download ID received, filename shown)
- Error during extraction or download: `clipping` -> `error` (error alert displayed, retry enabled)

**API surface**:
| Message / API | Direction | Key inputs | Key outputs | Auth / Context | Key errors |
|---|---|---|---|---|---|
| `browser.scripting.executeScript` | Popup to Tab | `tabId: number`, `extractDomSelection` function | `ActiveTabSelection` | Active tab | Restricted URL, Frame access denied |
| `DOWNLOAD_MARKDOWN` | Popup to Background | `filename: string`, `content: string` | `{ success: boolean; downloadId?: number; error?: string }` | Extension runtime | Storage full, Download canceled |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Preview load | Selection presence | Evaluated from `window.getSelection().toString().trim().length > 0` |
| Preview load | Selection word count | Computed via `Intl.Segmenter` (granularity: 'word') with `/\s+/` fallback |
| Preview load | Selection snippet | First 160 characters of selection text trimmed with ellipsis |
| Markdown generate | Selection body | Extracted and sanitized selection HTML passed through `convertHtmlToMarkdown()` |
| Markdown generate | YAML frontmatter | Source metadata combined with required `type: 'highlight'` and word count |
| Markdown generate | Reading time | Computed from selection word count at 200 WPM (`Math.max(1, Math.ceil(wordCount / 200))`) |
| Download trigger | Saved filename | Slugified page title formatted as `{slug}-highlight.md` |

**Key invariants**:
- When no selection exists on the page, the extension must function identically to full page clipping without regressions.
- If a selection contains empty whitespace or line breaks only, `hasSelection` evaluates to false.
- Frontmatter for highlights must always include `type: highlight` and preserve original article source URL and title for reliable citation.
- Selections spanning across iframe boundaries that cannot be read fall back to full article mode without throwing unhandled exceptions.

**Security model**:
- Injected selection helper runs within the isolated extension world.
- Extracted selection HTML is parsed safely into a detached container with all `<script>`, `<style>`, `<iframe>`, `object`, and inline event attributes stripped prior to serialization.
- Frontmatter values are serialized using js-yaml with quotes enabled, preventing delimiter injection (`---`) and YAML key hijacking from untrusted page titles or author strings.
- Restricted URLs are blocked at the popup boundary before any script execution occurs.

**Configuration required**:
- Reuses existing permissions: `activeTab`, `scripting`, and `downloads`. No new permissions needed.

**Critical test scenarios**:
- Happy path selection: User highlights two paragraphs on an article; popup shows "Selection" chip and "Download Selection"; clicking button downloads markdown containing selected text and required `type: highlight` frontmatter, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**
- Formatted text preservation: User highlights text containing links and inline code; resulting markdown preserves link targets and backticks, verifies **AC-2**, **AC-3**
- Safe HTML stripping: User highlights content containing script tags or inline handlers; extracted markdown strips malicious tags while retaining valid markup, verifies **AC-2**
- Seamless fallback: User opens popup with no selection; popup displays full article preview and "Download Markdown" button as normal, verifies **AC-1**, **AC-5**
- Restricted page protection: Opening popup on `chrome://` or Web Store URL shows unsupported URL error gracefully and blocks script execution, verifies **AC-6**
- Iframe boundary selection: User selects text inside an unreachable iframe; popup falls back smoothly to full article mode, verifies **AC-5**, **AC-7**
- Size limit guardrail: User selects an entire 100,000 character page; extractor clamps length and prevents popup freezing, verifies **AC-7**
- International word counting: CJK selection accurately counts words via `Intl.Segmenter`, verifies **AC-4**

## Build plan

Verified file layout:
- `entrypoints/schema/types.ts`: Add `HighlightMarkdownFrontmatter` and update frontmatter type definitions.
- `entrypoints/schema/frontmatter.ts`: Update frontmatter builder and serializer to support `type: highlight`.
- `entrypoints/schema/download.ts`: Support `{slug}-highlight.md` naming convention.
- `entrypoints/popup/services/extractor.ts`: Implement `extractDomSelection` (with `Intl.Segmenter`, sanitization, guardrails) and `extractSelectionFromTab`.
- `entrypoints/popup/components/PagePreviewCard.tsx`: Support selection badge, selection word count, and snippet preview.
- `entrypoints/popup/App.tsx`: Orchestrate selection detection on load, toggle "Download Selection" button label, and dispatch highlight download.
- `tests/selection.test.ts`: Unit and integration test suite covering AC-1 through AC-7.

## Consequences

**Positive**:
- Users can instantly clip quotations and code passages without cluttering their notes with entire web pages.
- Frontmatter clearly identifies highlights for structured knowledge management in tools like Obsidian.
- Preserves rich formatting (links, lists, inline code) within selected blocks.
- Robust security against script injection and YAML delimiter attacks.
- Graceful handling of edge cases (iframes, huge selections, international text, restricted pages).

**Negative / tradeoffs**:
- Complex cross iframe selections cannot be fully reconstructed when cross origin security prevents parent frame access.
- Capping massive selections at 50,000 characters prioritizes browser responsiveness over archiving giant manual selections.

**Neutral**:
- Settings to customize whether highlights default to blockquotes or raw paragraphs can be added in a future options page slice.

## Follow-up

- [ ] Add keyboard shortcut in Slice 3 (Feature 7) to trigger highlight clipping with a single keypress.
- [ ] Explore optional blockquote wrapper setting for clipped highlights in the options page.

## References

**Project sources**:
- `docs/specs/0001-extension-stack-and-architecture.md`: Extension framework and Manifest V3 architecture
- `docs/specs/0002-extension-schema-and-settings.md`: YAML frontmatter schema and Turndown conversion rules
- `docs/specs/0003-popup-ui-foundation.md`: Popup interface components and layout tokens
- `docs/specs/0004-core-markdown-download-loop.md`: Core active tab extraction and download dispatch pipeline
- `docs/scope/scope.md`: Slice 2 definition and scope tracking

**Practices & standards**:
- W3C Selection and Range API standard specifications
- Mozilla Readability and Turndown best practices
- Chrome Extensions Manifest V3 Scripting guidelines
- Intl.Segmenter specification (TC39) for international text boundary detection

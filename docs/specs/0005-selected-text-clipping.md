# 0005. Selected text clipping

**Date**: 2026-09-20
**Status**: Proposed

## Summary

This specification defines the selected text clipping feature for Web to Markdown (Feature 6, Slice 2). When a user highlights text on a web page and opens the popup, the extension automatically detects the selection, extracts the rich formatting, and presents a dedicated selection preview. Clicking download exports only the highlighted passage formatted in clean markdown with full source frontmatter and a highlight tag.

## Context

Readers and researchers frequently want to save only a key quotation, code snippet, or argument from a long web page rather than archiving the entire article. While Feature 5 provides full page clipping, saving an entire 5000 word article when only a single paragraph is needed clutters note taking systems like Obsidian with irrelevant material.

Extracting a user selection in a browser extension requires reading the active tab DOM selection state. Web page selections can range from a single sentence to multiple sections containing headers, bold text, links, lists, or code snippets. Relying strictly on plain text loses rich markup and requires the user to manually reformat quotes.

We need a lightweight, resilient pipeline that automatically detects when text is highlighted on the active tab, extracts the rich DOM fragment, converts it to markdown, attaches proper source frontmatter, and adapts the popup user interface without breaking full article clipping when no text is selected.

## Requirements

**User stories**:
- As a researcher, I want to highlight a passage on a web page and open the extension so that I can clip only the selected passage with its source URL and author.
- As a researcher, I want the formatting inside my selection (such as links, lists, and bold text) preserved in markdown so that I do not need to reformat quotations by hand.
- As a researcher, I want the generated markdown note to indicate that it is a highlight so that I can search and filter quotes separately in my knowledge base.
- As a user, I want the extension to fall back to full article clipping automatically when no text is highlighted so that the extension workflow stays smooth.

**Acceptance criteria**:
- **AC-1**: Active tab selection detection: Opening the popup inspects the active tab DOM for active text selection via `window.getSelection()`. If non empty text is highlighted, the popup automatically activates selection clipping mode.
- **AC-2**: Rich HTML selection extraction: Injected runner clones the selection DOM range via `window.getRangeAt(0).cloneContents()` into a temporary container, preserving nested formatting, links, lists, and code blocks.
- **AC-3**: Markdown conversion for selections: Extracted selection HTML is converted to clean markdown using Turndown with GitHub Flavored Markdown enabled, omitting full page layout noise.
- **AC-4**: Highlight frontmatter generation: Standard YAML frontmatter is generated containing page title, source URL, author, date, selection word count, reading time, and an explicit `type: highlight` property.
- **AC-5**: Popup UI adaptation and fallback: When a selection is detected, the preview card displays a "Selection" chip with the selection word count and an excerpt snippet, and the primary action button changes its label to "Download Selection"; when no text is selected, the popup operates in full article mode without errors.

## Options considered

### Option 1: Automatic selection detection with rich HTML cloning (Chosen)
Inspect active tab selection on popup open. If text is highlighted, extract the cloned DOM fragment via `range.cloneContents()`, convert rich markup through Turndown, attach source frontmatter with `type: highlight`, and update the popup UI to selection mode. Fall back to standard full page clipping if no selection exists.

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

We automatically detect the active tab selection on popup open, extract the rich HTML fragment, convert it into clean markdown, prepend frontmatter with `type: highlight`, and update popup preview elements to reflect the selection.

**Implementation skills**:
- `chrome-extensions` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`)
- `modern-web-guidance` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/`)
- `chrome-devtools-axi` (`kunchenguid/chrome-devtools-axi`, `.agents/skills/chrome-devtools-axi/`)

## Rationale

Option 1 provides the most frictionless user experience for note takers. When a user highlights text on a page and clicks an extension icon, their clear intent is to clip that passage. Requiring an extra toggle click creates unnecessary interaction overhead.

Furthermore, extracting the cloned DOM fragment rather than plain text retains important technical context such as syntax highlighted keywords, documentation links, and bulleted steps. Adding `type: highlight` into the YAML frontmatter allows Obsidian Dataview queries and static site generators to index clippings accurately.

## Feature design

**Data model sketch**:
```ts
export interface ActiveTabSelection {
  hasSelection: boolean;
  text: string;
  html: string;
  wordCount: number;
}

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
export interface HighlightMarkdownFrontmatter extends MarkdownFrontmatter {
  type?: 'highlight' | 'article';
}
```

**State transitions**:
- Popup open on tab without selection: `idle` (full article preview loaded, action button: "Download Markdown")
- Popup open on tab with selection: `idle` (selection preview loaded with "Selection" badge, action button: "Download Selection")
- User clicks Download: `idle` -> `clipping` (converting selection, serializing frontmatter) -> `success` (download ID received, filename shown)
- Error during extraction or download: `clipping` -> `error` (error alert displayed, retry enabled)

**API surface**:
| Message / API | Direction | Key inputs | Key outputs | Auth / Context | Key errors |
|---|---|---|---|---|---|
| `browser.scripting.executeScript` | Popup to Tab | `tabId: number`, `extractDomSelection` function | `ActiveTabSelection` | Active tab | Restricted URL, Frame access denied |
| `DOWNLOAD_MARKDOWN` | Popup to Background | `filename: string`, `content: string` | `downloadId: number` | Extension runtime | Storage full, Download canceled |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Preview load | Selection presence | Evaluated from `window.getSelection().toString().trim().length > 0` |
| Preview load | Selection word count | Computed from selection text split on whitespace |
| Preview load | Selection snippet | First 160 characters of selection text trimmed with ellipsis |
| Markdown generate | Selection body | Extracted selection HTML passed through `convertHtmlToMarkdown()` |
| Markdown generate | YAML frontmatter | Source metadata combined with `type: "highlight"` and selection word count |
| Download trigger | Saved filename | Slugified page title prefixed or suffixed with highlight identifier or slug |

**Key invariants**:
- When no selection exists on the page, the extension must function identically to full page clipping without regressions.
- If a selection contains empty whitespace or line breaks only, `hasSelection` evaluates to false.
- Frontmatter for highlights must always preserve the original article source URL and title for reliable citation.

**Security model**:
- Injected selection helper runs within the isolated extension world.
- Extracted selection HTML is parsed safely using `document.createRange().cloneContents()` inside a headless div container before stringification.

**Configuration required**:
- No new manifest permissions or environment variables required; reuses `activeTab`, `scripting`, and `downloads`.

**Critical test scenarios**:
- Happy path selection: User highlights two paragraphs on an article; popup shows "Selection" chip and "Download Selection"; clicking button downloads markdown containing selected text and `type: highlight` frontmatter, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**
- Formatted text preservation: User highlights text containing links and inline code; resulting markdown preserves link targets and backticks, verifies **AC-2**, **AC-3**
- Seamless fallback: User opens popup with no selection; popup displays full article preview and "Download Markdown" button as normal, verifies **AC-1**, **AC-5**
- Restricted page protection: Opening popup on `chrome://` with selected text shows unsupported URL error gracefully, verifies **AC-1**, **AC-5**

## Build plan

1. Create tab selection helper functions in `entrypoints/popup/services/extractor.ts` (`extractDomSelection`, `extractSelectionFromTab`), satisfying **AC-1**, **AC-2**
2. Update frontmatter builder in `entrypoints/schema/frontmatter.ts` to support optional `type: highlight` and selection metadata, satisfying **AC-4**
3. Update `entrypoints/popup/App.tsx` and `entrypoints/popup/components/PagePreviewCard.tsx` to detect selection mode, render the "Selection" badge and snippet excerpt, and bind "Download Selection" action, satisfying **AC-1**, **AC-3**, **AC-5**
4. Add comprehensive unit and integration tests in `tests/selection.test.ts` covering selection extraction, HTML conversion, frontmatter tagging, and UI state switches, satisfying **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:
- Users can instantly clip quotations and code passages without cluttering their notes with entire web pages.
- Frontmatter clearly identifies highlights for structured knowledge management in tools like Obsidian.
- Preserves rich formatting (links, lists, inline code) within selected blocks.

**Negative / tradeoffs**:
- Extremely complex nested DOM selections across disparate table cells or disconnected iframe nodes may flatten or drop unsupported table layout boundaries.

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

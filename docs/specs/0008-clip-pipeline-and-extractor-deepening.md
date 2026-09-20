# 0008. Deepen Clip Pipeline and Extractor Modules for Testability and AI Navigability

**Date**: 2026-09-21
**Status**: Accepted

## Summary

This specification consolidates duplicated clipping workflows and separates browser scripting from pure content extraction. We extract a deep ClipPipeline module to unify the clip sequence across the background service worker and popup interface. At the same time, we split extraction logic into a pure DomExtractor and a browser aware TabExtractor. These changes improve testability in happy dom test suites and make code navigation straightforward for human engineers and coding agents alike.

## Context

The extension currently executes markdown clipping in two separate locations. In background.ts, handleCommandClip queries the active tab, inspects selected text, constructs frontmatter metadata, converts HTML to markdown, formats a file name, and initiates download. In App.tsx, handleClip duplicates this exact orchestration sequence with minor differences in error state setting and message passing. This duplication creates subtle divergence risks whenever frontmatter structures, preset formatting rules, or multi destination dispatch logic change.

In addition, entrypoints/schema/extractor.ts combines two distinct concerns in one large file. Pure document parsing functions such as extractDomPreview and extractDomSelection do not need any browser extension APIs. Conversely, functions like getActiveTab and extractFullArticleFromTab rely heavily on browser.tabs and browser.scripting. Testing pure document extraction presently requires importing a module tangled with extension dependencies. 

By deepening the architecture along these seams, we isolate side effects at the system boundaries and provide small, focused interfaces that hide internal orchestration details.

## Requirements

**User stories**:
- As an extension developer, I want clipping orchestration consolidated in one place so that shortcut clipping and popup clipping never diverge in behavior or output format.
- As a test author, I want DOM extraction functions isolated from browser tab APIs so that unit tests can verify HTML parsing quickly inside happy dom without complex browser mocks.
- As an AI coding agent or maintainer, I want distinct module boundaries with deep interfaces so that changes to conversion or extraction stay local and predictable.

**Acceptance criteria**:
- **AC-1**: A unified ClipPipeline module coordinates active tab resolution, selection detection, frontmatter generation, markdown conversion, and output dispatch.
- **AC-2**: Both the background command handler (handleCommandClip) and the popup clip action (handleClip) invoke the ClipPipeline module rather than reimplementing extraction and conversion steps.
- **AC-3**: DomExtractor contains only pure document parsing, URL validation, and selection text parsing with zero dependencies on browser extension APIs.
- **AC-4**: TabExtractor encapsulates all browser.tabs and browser.scripting interactions, delegating content analysis to DomExtractor and the readability runner.
- **AC-5**: Existing public exports from entrypoints/schema/extractor.ts and entrypoints/popup/services/extractor.ts remain backwards compatible through clean re exports.
- **AC-6**: Unit tests verify DomExtractor functions directly under happy dom without mocking browser runtime APIs.
- **AC-7**: All existing test suites pass cleanly with no regression in clipping, shortcut triggers, or dispatch functionality.

## Options considered

### Option 1: Status Quo

Keep the duplicated clip orchestration across background.ts and App.tsx, while retaining all extraction helpers in one mixed extractor.ts file.

**Pros**:
- Requires no code changes today.
- Zero refactoring risk in the immediate term.

**Cons**:
- Bug fixes or metadata additions must be applied in two separate files.
- Testing DOM extraction requires navigating browser tab dependencies.
- Increases cognitive load for developers and AI assistants reading the codebase.

### Option 2: Lightweight Helper Functions

Extract small helper functions for frontmatter assembly and file name generation, but leave the main async orchestration loops inside background.ts and App.tsx.

**Pros**:
- Low effort to implement.
- Shares basic string assembly routines.

**Cons**:
- Fails to eliminate orchestration divergence between popup and shortcut paths.
- The pipeline seam remains shallow and leaky.
- Does not address the mixed DOM and browser scripting concerns in extractor.ts.

### Option 3: Deep ClipPipeline and Split Extractor Modules

Create a deep ClipPipeline module with a minimal interface (executeClip) that absorbs tab query fallback, selection branching, frontmatter synthesis, HTML conversion, and destination routing. Concurrently split extractor.ts into DomExtractor (pure DOM) and TabExtractor (browser tab scripting).

**Pros**:
- Eliminates logic duplication between background commands and popup UI.
- Shrinks the public surface while increasing implementation depth.
- DomExtractor becomes completely pure and easily unit tested in happy dom.
- Clean separation of concerns makes the codebase easy to navigate and modify.

**Cons**:
- Requires updating imports and testing existing call sites thoroughly.

## Decision

**Chosen option**: Option 3: Deep ClipPipeline and Split Extractor Modules

Consolidate all clipping orchestration into entrypoints/schema/clipPipeline.ts, split DOM extraction from tab scripting into entrypoints/schema/domExtractor.ts and entrypoints/schema/tabExtractor.ts, and retain backwards compatible barrel re exports.

**Implementation skills**: `chrome-extension` (Developer/projects/chrome-extensions/.agents/skills/skills-chrome-extension/), `codebase-design` (~/.gemini/config/plugins/mattpocock-skills/skills/codebase-design/)

## Rationale

Option 3 delivers superior locality and leverage. The clipping sequence is the central value path of NoteErEx. Having two independent implementations in background.ts and App.tsx means any new provider, frontmatter field, or sanitization rule must be remembered twice. Placing this orchestration behind a deep ClipPipeline module concentrates bugs in one place and cuts the call site surface down to a single function call.

Splitting extractor.ts satisfies the substitution and testability principle. Functions that read a DOM Document or Window object have no business living in the same module as functions that inject scripts into Chrome tabs. When DOM parsing functions are pure, unit tests can execute in happy dom with instant feedback and zero mocking boilerplate.

## Feature design

### Module Structure

```
entrypoints/schema/
├── domExtractor.ts       (Pure DOM and URL logic: isSupportedUrl, extractDomPreview, extractDomSelection)
├── tabExtractor.ts       (Browser scripting logic: getActiveTab, extractPreviewFromTab, extractSelectionFromTab, extractFullArticleFromTab)
├── extractor.ts          (Backwards compatible re exports from domExtractor and tabExtractor)
└── clipPipeline.ts       (Deep orchestrator: executeClip, assembleClipPayload)
```

### Module Interfaces

#### DomExtractor Interface
```ts
export const UNSUPPORTED_SCHEMES: readonly string[];
export const MAX_SELECTION_CHARS: number;

export function isSupportedUrl(url?: string): boolean;

export function extractDomPreview(
  doc: Document,
  fallbackTitle?: string,
  fallbackUrl?: string,
): PageMetadataPreview;

export function extractDomSelection(
  win: Window,
  fallbackTitle?: string,
  fallbackUrl?: string,
): ExtractedSelectionPayload;
```

#### TabExtractor Interface
```ts
export async function getActiveTab(): Promise<ActiveTab | null>;

export async function extractPreviewFromTab(
  tab: ActiveTab,
): Promise<PageMetadataPreview>;

export async function extractSelectionFromTab(
  tab: ActiveTab,
): Promise<ExtractedSelectionPayload>;

export async function extractFullArticleFromTab(
  tab: ActiveTab,
): Promise<ExtractedArticle>;
```

#### ClipPipeline Interface
```ts
export interface ClipPipelineOptions {
  tab?: ActiveTab;
  preferredTitle?: string;
  preferredAuthor?: string;
  destinations?: string[];
  downloadLocally?: boolean;
}

export interface ClipPipelineResult {
  success: boolean;
  mode: 'selection' | 'article';
  title: string;
  filename: string;
  markdown: string;
  downloadId?: number;
  dispatchResults?: Record<string, { success: boolean; error?: string }>;
}

export async function executeClip(
  options?: ClipPipelineOptions,
): Promise<ClipPipelineResult>;
```

### Value Sourcing

| Action | Value produced or displayed | Source |
|---|---|---|
| executeClip | Active tab context | Provided option tab or resolved via getActiveTab() |
| executeClip | Selection or Article mode | Extracted via extractSelectionFromTab() inspection |
| executeClip | Markdown frontmatter | Assembled via buildFrontmatter() and serializeFrontmatter() |
| executeClip | Converted markdown body | Generated via convertHtmlToMarkdown() from HTML source |
| executeClip | Disk file download | Dispatched via downloadMarkdown() in background or background message |
| executeClip | Multi destination dispatch | Dispatched via defaultDispatchEngine when provider IDs are supplied |

### Key Invariants

- Unsupported browser schemes (chrome://, edge://, about:) must fail fast before running tab injection.
- DomExtractor must never import from wxt/browser or chrome extension namespaces.
- ClipPipeline must guarantee identical markdown and frontmatter output whether triggered via keyboard shortcut or popup button.
- If selected text is empty or whitespace, ClipPipeline automatically falls back to full article extraction.
- In multi destination mode, failure in one provider must not cancel local download or other providers.

### Security Model

- Tab script execution uses the principle of least privilege, injecting only minimal reader and selection extraction functions into the active tab.
- Document sanitization strips script, style, and iframe elements prior to markdown conversion.
- Frontmatter values are escaped to prevent YAML injection attacks from malicious page titles or author strings.

### Critical Test Scenarios

- **Pure DOM extraction without browser mocks**: Verify extractDomPreview and extractDomSelection against happy dom Document fixtures, verifying **AC-3** and **AC-6**.
- **Tab extractor script injection**: Verify getActiveTab and tab extraction functions with mocked browser tab responses, verifying **AC-4**.
- **ClipPipeline article clipping**: Run executeClip on a mock tab with no text selection and verify generated markdown, title, and local download dispatch, verifying **AC-1** and **AC-2**.
- **ClipPipeline highlight clipping**: Run executeClip on a mock tab with selected text and verify highlight frontmatter and excerpt formatting, verifying **AC-1** and **AC-2**.
- **Backwards compatibility check**: Ensure existing tests and barrel imports from extractor.ts function without modification, verifying **AC-5** and **AC-7**.

## Build plan

- [x] 1. Create entrypoints/schema/domExtractor.ts containing pure URL validation and DOM extraction functions, satisfying **AC-3**.
- [x] 2. Create entrypoints/schema/tabExtractor.ts containing active tab resolution and browser scripting calls, satisfying **AC-4**.
- [x] 3. Update entrypoints/schema/extractor.ts to re export all symbols from domExtractor.ts and tabExtractor.ts, preserving backwards compatibility, satisfying **AC-5**.
- [x] 4. Create entrypoints/schema/clipPipeline.ts implementing executeClip to unify extraction, frontmatter synthesis, markdown conversion, and dispatch, satisfying **AC-1**.
- [x] 5. Refactor background.ts (handleCommandClip) and entrypoints/popup/App.tsx (handleClip) to use executeClip, satisfying **AC-2**.
- [x] 6. Add unit tests for domExtractor.ts and clipPipeline.ts in tests/dom-extractor.test.ts and tests/clip-pipeline.test.ts, satisfying **AC-6** and **AC-7**.
- [x] 7. Run the entire test suite and type check to verify zero regressions across all extension workflows, satisfying **AC-7**.

## Consequences

**Positive**:
- Logic duplication between background service worker and popup UI drops to zero.
- Pure DOM functions can be tested without mock overhead.
- AI assistants and human developers have clear boundaries between DOM processing and extension platform APIs.
- Adding future providers or frontmatter fields requires changing only ClipPipeline.

**Negative**:
- Adds two new schema files, requiring awareness of the new module layout.

**Neutral**:
- Re exports in extractor.ts ensure existing external callers continue to function without immediate rewrites.

## Follow up

- Update docs/scope/scope.md to record this architectural deepening under the Foundations or Slice 4 verification rollup.
- Integrate the newly deepened ClipPipeline directly with popup provider toggles when building the multi destination UI controls.

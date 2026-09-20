# Review: Clip pipeline and extractor deepening (0008)

**Date**: 2026-09-21
**Reviewed by**: Staff Code Reviewer
**Scope**: 8 files, uncommitted changes
**Verdict**: Approve with nits

## Summary
This change isolates browser scripting from pure content extraction and consolidates duplicated clipping workflows into a unified ClipPipeline module. The refactoring eliminates over 120 lines of duplicate orchestration between the background service worker and popup interface. Backwards compatibility is maintained through barrel re-exports, and pure DOM extraction is now verified directly in happy dom without browser API mocks.

## Nits
- ⚪ `entrypoints/schema/clipPipeline.ts:38`, `defaultPipelineDispatchEngine` creates an independent DispatchEngine instance while `entrypoints/background.ts:7` creates `defaultDispatchEngine`. Consider sharing or re-exporting a single engine instance in a future cleanup.
- ⚪ `entrypoints/schema/domExtractor.ts:120`, The helper `countWords` uses `Intl.Segmenter` when available; for languages without whitespace separation this is robust, but for very large documents with >100k words consider caching if invoked repeatedly on raw text.

## Strengths
- Clean architectural boundary separating pure DOM parsing in `domExtractor.ts` with zero extension platform dependencies.
- Single unified entry point `executeClip` eliminates subtle drift between shortcut clipping and popup clipping.
- Backwards compatible re-exports in `extractor.ts` ensure existing caller contracts remain intact.
- Comprehensive test coverage with 13 new unit tests covering pure DOM extraction, node sanitization, and pipeline branching logic.

## Test coverage
- High quality test coverage: 13 tests across `tests/dom-extractor.test.ts` and `tests/clip-pipeline.test.ts` cover both happy paths and edge cases (restricted URLs, whitespace fallback, sanitization, highlight vs article modes).
- Full extension test suite passes 100% (79 of 79 tests across 11 test suites).
- Extension build and Playwright runtime verification pass without errors.

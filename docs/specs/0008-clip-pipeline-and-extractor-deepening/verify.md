# Verify: Clip pipeline and extractor deepening · spec 0008 · updated 2026-09-21

_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] On a supported web article with no text selection, click Download Markdown in popup -> confirm file downloads with `type: article` frontmatter and clean body -> AC-1, AC-2
- [x] On a supported web article with text selected, open popup -> confirm Download Selection label, click download -> confirm file `{slug}-highlight.md` downloads with `type: highlight` frontmatter -> AC-1, AC-2
- [x] Press keyboard shortcut `Alt+Shift+D` on active tab -> confirm background service worker coordinates clip and triggers download -> AC-2
- [x] Navigate to restricted URL (`chrome://extensions`, `about:blank`, Chrome Web Store) -> confirm popup shows error and prevents clipping -> AC-3, AC-4

## Commands

- [x] `pnpm run typecheck` -> TypeScript typecheck runs with 0 errors -> AC-1, AC-5
- [x] `pnpm run lint` -> ESLint runs with 0 warnings or errors -> AC-7
- [x] `pnpm run test` -> Vitest runs all 11 test suites (79 tests) with 100% pass -> AC-1, AC-3, AC-6, AC-7
- [x] `pnpm run build` -> WXT builds extension bundles for Chrome MV3 in under 1s -> AC-7
- [x] `node verify-runtime.mjs` -> Playwright runtime verification runs in live Chromium -> AC-1, AC-2, AC-7

## Acceptance-criteria coverage

- AC-1 (Unified ClipPipeline module): covered by `entrypoints/schema/clipPipeline.ts`, `tests/clip-pipeline.test.ts`, and popup download verification
- AC-2 (Orchestration call sites refactored): covered by `handleCommandClip` in `background.ts`, `handleClip` in `App.tsx`, and `tests/download-loop.test.tsx`
- AC-3 (Pure DomExtractor module): covered by `entrypoints/schema/domExtractor.ts` and `tests/dom-extractor.test.ts`
- AC-4 (Browser TabExtractor module): covered by `entrypoints/schema/tabExtractor.ts` and `tests/extractor.test.ts`
- AC-5 (Backwards compatible barrel exports): covered by `entrypoints/schema/extractor.ts` and clean `pnpm run typecheck`
- AC-6 (DomExtractor happy-dom tests without mocks): covered by `tests/dom-extractor.test.ts`
- AC-7 (Zero regressions across extension test suites): covered by `pnpm test` (79 of 79 tests passing) and `node verify-runtime.mjs`

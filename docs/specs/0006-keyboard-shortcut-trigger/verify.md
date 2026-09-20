# Verify: Keyboard shortcut trigger · spec 0006 · updated 2026-09-20

_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Open `chrome://extensions/shortcuts` -> confirm `clip-to-markdown` command is registered with default `Command+Shift+M` on macOS and `Ctrl+Shift+M` on Windows/Linux -> AC-1
- [x] Remap shortcut in `chrome://extensions/shortcuts` to custom combination -> confirm shortcut triggers correctly -> AC-1
- [x] On a supported web article page with no text selected, press shortcut -> confirm transient badge `…` appears, file `{slug}.md` downloads with `type: article` frontmatter, and success notification shows `Saved {slug}.md` -> AC-2, AC-4, AC-5
- [x] On a supported web article page with text selected, press shortcut -> confirm file `{slug}-highlight.md` downloads with `type: highlight` frontmatter, and success notification shows `Saved {slug}-highlight.md` -> AC-3, AC-4, AC-5
- [x] Navigate to restricted page (`chrome://settings`, `about:blank`, Chrome Web Store) and press shortcut -> confirm no script injection occurs and error notification displays `Cannot clip this page` -> AC-5, AC-6
- [x] On a page where article extraction fails, press shortcut -> confirm error notification displays `Clipping failed` -> AC-5

## Commands

- [x] `pnpm run typecheck` -> TypeScript typecheck runs with 0 errors -> AC-1, AC-4
- [x] `pnpm run lint` -> ESLint runs with 0 warnings or errors -> AC-1, AC-4
- [x] `pnpm run test` -> Vitest unit and integration test suite passes all tests -> AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- [x] `pnpm run build` -> WXT build produces extension bundle with manifest commands -> AC-1
- [x] `node verify-runtime.mjs` -> Playwright runtime verification runs in Chromium -> AC-1, AC-2

## Acceptance-criteria coverage

- AC-1 (Command declaration and remapping): covered by `chrome://extensions/shortcuts` check, `pnpm run build`, and `tests/shortcut.test.ts`
- AC-2 (Active tab extraction via command): covered by full article shortcut trigger step and `tests/shortcut.test.ts`
- AC-3 (Selection-aware highlight clipping): covered by selection shortcut trigger step and `tests/shortcut.test.ts`
- AC-4 (Markdown conversion and download): covered by download inspection steps and `tests/shortcut.test.ts`
- AC-5 (System notifications and badge indicator): covered by notification checks and `tests/shortcut.test.ts`
- AC-6 (Restricted URL guards): covered by restricted page trigger step and `tests/shortcut.test.ts`

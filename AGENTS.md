# Web to Markdown Chrome Extension

## Stack

- **Language / Runtime**: TypeScript, Node 20+
- **Framework**: WXT (Vite-based Manifest V3 framework)
- **UI Framework**: React 19, Tailwind CSS v4
- **Key dependencies**: @mozilla/readability, turndown, turndown-plugin-gfm, js-yaml
- **Package manager**: pnpm only (pnpm-lock.yaml with `autoInstallPeers: true`)
- **Test environment**: happy-dom via Vitest
- **Browser automation**: Playwright for runtime verification

## Build approach

Tracer Bullet (build vertical slices end to end through every layer so each slice works completely).

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone
- `.kilo/` is in `.gitignore` (agent workspace, not committed)

## Commands

```bash
# Install (also runs wxt prepare via postinstall)
pnpm install

# Dev server (Chrome HMR)
pnpm run dev

# Dev server (Firefox)
pnpm run dev:firefox

# Build extension
pnpm run build

# Build for Firefox
pnpm run build:firefox

# Zip for distribution
pnpm run zip
pnpm run zip:firefox

# Typecheck
pnpm run typecheck        # same as tsc --noEmit

# Lint & Format
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check

# Test
pnpm run test             # vitest run, happy-dom environment

# Runtime verification (Playwright)
node verify-runtime.mjs   # launches Chromium with extension loaded, tests popup interaction
```

## Architecture

Entrypoints under `entrypoints/`:
- `background.ts` — Manifest V3 service worker; initializes storage, handles messages
- `popup/` — React UI (380px wide, 520px max height), components, services, types
- `readability-runner.ts` — Unlisted runner executing Mozilla Readability inside tab DOM
- `schema/` — Data schemas, storage, frontmatter, presets, conversion, errors, downloads

### Key constraints

- **Always use the WXT `browser` API**, never `chrome` directly
- **Named exports only** — no default exports (`export const Header`, not `export default`)
- **Functions are pure**; push storage, download, and notification side effects to boundaries
- **Popup unmounts immediately** when user clicks away; delegate downloads to `entrypoints/background.ts` via data URLs to prevent blob revocation
- **Never emit null or empty strings** in optional frontmatter fields; omit them entirely
- **Preset matching**: normalized hostnames without leading `www.`, enforce dot boundaries for wildcards
- **Strict TypeScript**: no `any`, strict null checks, exhaustive union types for extension messages

### Popup specifics

- Fixed 380px wide, capped at 520px tall; overflow hidden
- Dark mode via `prefers-color-scheme` media queries and `dark:` Tailwind classes
- Status union type: `'idle' | 'clipping' | 'success' | 'error'`
- All interactive elements use `focus-visible:ring-2` for accessible focus
- Status announcements use `role="status"` and `aria-live="polite"`
- **Gotcha**: `focus-visible:outline-hidden` may be invalid in Tailwind v4; replace with `focus-visible:outline-none` if needed
- **Gotcha**: `overflow-y` is not explicitly set on body; content exceeding 520px could cause scrollbars

## Testing

- **Unit tests**: Vitest with `happy-dom` environment (`tests/` directory)
- **Browser tests**: Playwright AXI for automated extension testing
- **Runtime verification**: `node verify-runtime.mjs` launches Chromium with the built extension loaded and tests popup interaction
- Test files: `tests/popup.test.tsx`, `tests/download-loop.test.tsx`, `tests/download.test.ts`, `tests/extractor.test.ts`, `tests/sample.test.ts`

## Tooling

- **Linter & Formatter**: ESLint + Prettier (with TypeScript and React plugins)
  - ESLint: `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`
  - Prettier: semi, singleQuote, tabWidth 2, trailingComma all, printWidth 80
- **Typecheck**: `tsc --noEmit` (extends `.wxt/tsconfig.json`)
- **Build**: WXT with `@wxt-dev/module-react` module and `@tailwindcss/vite` plugin

## Agent agents

Custom agents in `.agents/agents/`:
- **architect** — Design specs, write to `docs/specs/`; confined to architecture and spec drafting
- **developer** — Implement approved specs; follows Spec Gate workflow, routes to `/architect` if no spec exists
- **checker** — Verify against spec acceptance criteria (`/check verify`) or review diffs (`/check review`); read-only

## Agent skills

- [chrome-extensions](.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/): Manifest V3 best practices, service worker lifecycle, extension APIs
- [chrome-devtools-axi](.agents/skills/chrome-devtools-axi/): Agent CLI for live Chrome browser control, snapshots, runtime verification
- [playwright-axi](.agents/skills/playwright-axi/): Playwright browser automation CLI for automated testing
- [reactive-editor](.agents/skills/reactive-editor/): Live browser visual click feedback for React dev servers

## Context files

- `entrypoints/schema/AGENTS.md`: Data schema, storage, frontmatter, presets, conversion configuration
- `entrypoints/popup/AGENTS.md`: Popup UI architecture, components, layout constraints, styling rules, state model
- `CLAUDE.md`: Pointer to `AGENTS.md` (imports `@AGENTS.md`)

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`. Specs: [0001-extension-stack-and-architecture.md](docs/specs/0001-extension-stack-and-architecture.md), [0002-extension-schema-and-settings.md](docs/specs/0002-extension-schema-and-settings.md), [0003-popup-ui-foundation.md](docs/specs/0003-popup-ui-foundation.md), [0004-core-markdown-download-loop.md](docs/specs/0004-core-markdown-download-loop.md), [0005-selected-text-clipping.md](docs/specs/0005-selected-text-clipping.md).

## Rules

- Functions are pure by default: same input produces same output, with no side effects.
- Data is immutable: prefer `const`, `readonly`, and object spread over in-place mutation.
- Side effects (Chrome APIs, tab DOM reads, downloads) are pushed to explicit edges.
- Enforce strict TypeScript: no `any`, strict null checks, exhaustive union types for extension messages.
- Organize code folder-by-feature: colocate popup UI, content extraction, and background handlers.
- Named exports only; avoid default exports for predictable refactoring.
- Consistent error handling: return explicit Result objects or error boundaries, avoiding uncaught exceptions.
- Ensure accessibility baseline (WCAG AA): proper contrast, focus states, and keyboard accessibility.
- Follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.

## Important gotchas

- `postinstall` runs `wxt prepare` — required after cloning before dev/build
- `.wxt/`, `.output/`, `.temp*/**`, `dist/**` are build artifacts and ignored
- `focus-visible:outline-hidden` may be invalid in Tailwind v4
- Popup unmounts immediately on click-away; downloads must use data URLs delegated to background
- Restricted URLs (`chrome://`, `edge://`, `about:`, Chrome Web Store) cannot be scripted
- No `.github` CI workflows exist; verification is manual via `pnpm run test` and `node verify-runtime.mjs`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

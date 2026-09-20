# Web to Markdown Chrome Extension

## Stack

- **Language / Runtime**: TypeScript, Node 20+
- **Framework**: WXT (Vite-based Manifest V3 framework)
- **UI Framework**: React 19, Tailwind CSS
- **Key dependencies**: @mozilla/readability, turndown, turndown-plugin-gfm, js-yaml
- **Package manager**: pnpm (or npm)

## Build approach

Tracer Bullet (build vertical slices end to end through every layer so each slice works completely).

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Commands

```bash
# Install
pnpm install

# Dev server (Chrome HMR)
pnpm run dev

# Build extension
pnpm run build

# Typecheck
pnpm run typecheck

# Lint & Format
pnpm run lint
pnpm run format

# Test
pnpm run test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`. Specs: [0001-extension-stack-and-architecture.md](docs/specs/0001-extension-stack-and-architecture.md), [0002-extension-schema-and-settings.md](docs/specs/0002-extension-schema-and-settings.md), [0003-popup-ui-foundation.md](docs/specs/0003-popup-ui-foundation.md), [0004-core-markdown-download-loop.md](docs/specs/0004-core-markdown-download-loop.md).

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

## Tooling

- Linter & Formatter: ESLint + Prettier (with TypeScript and React plugins).
- Test Runner: Vitest for unit tests; Playwright AXI for automated browser extension testing.
- Checks before commit: lint + typecheck on every milestone commit.

## Agent skills

- [chrome-extensions](.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/): `googlechrome/modern-web-guidance`, Manifest V3 best practices, service worker lifecycle, and extension APIs
- [chrome-devtools-axi](.agents/skills/chrome-devtools-axi/): `kunchenguid/chrome-devtools-axi`, agent CLI for live Chrome browser control, snapshots, and runtime verification
- [playwright-axi](.agents/skills/playwright-axi/): `playwright-axi`, Playwright browser automation CLI for automated testing
- [reactive-editor](.agents/skills/reactive-editor/): `reactive-editor`, live browser visual click feedback for React dev servers

## Context files

- [entrypoints/schema/AGENTS.md](entrypoints/schema/AGENTS.md): data schema, storage, frontmatter, presets, and conversion configuration
- [entrypoints/popup/AGENTS.md](entrypoints/popup/AGENTS.md): popup UI architecture, components, layout constraints, styling rules, and state model

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

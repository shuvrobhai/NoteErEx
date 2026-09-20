# Popup UI

## Overview

The popup is the main user interface for the Web to Markdown extension. It renders in a constrained 380 pixel wide container with a maximum height of 520 pixels, built with React 19 and Tailwind CSS v4. The popup displays page metadata, provides a primary action button, and shows status feedback across four states: idle, clipping, success, and error.

## Key files

| File | Owns |
|---|---|
| `entrypoints/popup/index.html` | Popup HTML shell with browser action manifest type |
| `entrypoints/popup/main.tsx` | React entry point, renders App into the root div |
| `entrypoints/popup/App.tsx` | App shell assembly, state management, visual state switchers |
| `entrypoints/popup/style.css` | Base styles: body dimensions, color scheme, overflow constraints |
| `entrypoints/popup/types.ts` | Shared types: PopupStatus, PageMetadataPreview, PopupState |
| `entrypoints/popup/components/Header.tsx` | Branding, version badge, active preset chip, settings shortcut |
| `entrypoints/popup/components/PagePreviewCard.tsx` | Title truncation, domain, metadata chips (author, date, words, reading time) |
| `entrypoints/popup/components/ActionButton.tsx` | Primary action with idle, hover, active, loading, and disabled states |
| `entrypoints/popup/services/extractor.ts` | Active tab query, URL validation guards, preview and full article extraction |
| `entrypoints/readability-runner.ts` | Injected unlisted runner executing Mozilla Readability inside tab DOM context |
| `tests/popup.test.tsx` | Unit tests for all popup components and state transitions |
| `tests/download-loop.test.tsx` | End-to-end integration tests for extraction, conversion, frontmatter, and download loop |

## Commands

The popup shares root commands. No popup-specific commands exist.

## Conventions

- All popup styling uses Tailwind CSS v4 utility classes. Custom CSS lives only in `style.css` for base body dimensions and color scheme.
- `App.css` is a placeholder; all layout is managed via Tailwind and `style.css`.
- Components use named exports only (`export const Header`, not `export default`).
- The popup container is fixed at 380 pixels wide and capped at 520 pixels tall. Overflow is hidden to prevent scrollbars.
- Dark mode is automatic via `prefers-color-scheme` media queries in `style.css` and `dark:` Tailwind classes on all components.
- All interactive elements use `focus-visible:ring-2` for accessible focus indicators.
- Status announcements use `role="status"` and `aria-live="polite"` for screen reader support.
- The state model uses `PopupStatus` union type: `'idle' | 'clipping' | 'success' | 'error'`.
- Component state flows through `PopupState` which includes status, metadata, optional error message, and optional success filename.
- The App component includes visual state preview switchers (idle, clipping, success, error) for testing and verification purposes.
- Tab extraction runs on mount and downloads are delegated to the background worker via data URLs to prevent blob revocation on unmount.

## Gotchas

- The popup unmounts immediately when the user clicks away. Background downloads must be delegated to `entrypoints/background.ts` via data URLs.
- `overflow-y` is not explicitly set on the body element in `style.css`. Content that exceeds 520 pixels could cause vertical scrollbars. Monitor this as more content is added.
- `focus-visible:outline-hidden` is used on several buttons. Verify this is a valid Tailwind v4 class; if not, replace with `focus-visible:outline-none`.
- Restricted URLs (`chrome://`, `edge://`, `about:`, Chrome Web Store) cannot be scripted and display friendly error banners with retry buttons.

## Agent skills

- [chrome-extensions](.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/): `googlechrome/modern-web-guidance`, Manifest V3 best practices, service worker lifecycle, and extension APIs
- [chrome-devtools-axi](.agents/skills/chrome-devtools-axi/): `kunchenguid/chrome-devtools-axi`, agent CLI for live Chrome browser control, snapshots, and runtime verification
- [playwright-axi](.agents/skills/playwright-axi/): `playwright-axi`, Playwright browser automation CLI for automated testing
- [reactive-editor](.agents/skills/reactive-editor/): `reactive-editor`, live browser visual click feedback for React dev servers

## Related specs

- [0003-popup-ui-foundation.md](../../docs/specs/0003-popup-ui-foundation.md): Popup UI foundation spec with acceptance criteria AC-1 through AC-6
- [0004-core-markdown-download-loop.md](../../docs/specs/0004-core-markdown-download-loop.md): Core markdown download loop spec with acceptance criteria AC-1 through AC-6

_drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

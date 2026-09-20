# 0001. Manifest V3 extension stack and architecture

**Date**: 2026-09-20
**Status**: Proposed

## Summary

This decision establishes the core tech stack and architecture for the Web to Markdown Chrome Extension. We adopt WXT on Vite with TypeScript, React, and Tailwind CSS for the extension runtime and user interface. For content extraction and markdown generation, we use Mozilla Readability paired with Turndown, running fully client side in the browser.

## Context

The extension must extract article content from active browser tabs, format it into clean markdown with YAML frontmatter, and save the resulting file locally. In Manifest V3, Chrome enforces strict boundaries: background execution is restricted to ephemeral service workers that cannot access the DOM or hold persistent state, and content extraction must operate securely without remote code execution.

We need a build pipeline that provides fast local feedback, type safety, automated Manifest V3 generation, and dependable cross browser extension primitives. Without a modern framework, managing entry points, manifest permissions, TypeScript configuration, and live reload across popup, content script, and service worker requires fragile custom plumbing.

## Requirements

**User stories**:
- As a developer, I want a unified build pipeline and type safe extension API so that I can implement popup UI and background tasks without manual manifest editing.
- As a user, I want the extension to extract main article text and metadata cleanly into markdown without sending my page data to external servers.

**Acceptance criteria**:
- **AC-1**: The extension builds successfully into a Manifest V3 compliant bundle loaded directly into Chrome Developer Mode.
- **AC-2**: Development server supports hot module replacement for popup React components and automatic extension reload on background script edits.
- **AC-3**: Content extraction pipeline runs locally in the active tab context using Readability to strip clutter and ads.
- **AC-4**: HTML to markdown conversion handles headings, formatting, links, lists, code blocks, and frontmatter generation completely client side.

## Options considered

### Option 1: WXT with TypeScript, React, and Tailwind CSS (Chosen)

A modern Vite powered extension framework providing file based entry points, automatic manifest creation, type safe browser APIs, and fast hot module replacement.

**Pros**:
- Active maintenance, full Manifest V3 ergonomics, and built in dev server reload loop.
- Seamless TypeScript and React integration for popup and options UI.
- Direct ecosystem compatibility with Tailwind CSS and Vite plugins.

**Cons**:
- Framework layer over bare Vite; relies on WXT conventions for entry points.

### Option 2: CRXJS Vite Plugin with React

A Vite plugin that turns a standard `manifest.json` into the build entry point.

**Pros**:
- Direct control over Vite configuration without an overarching extension framework.
- Uses standard manifest file directly.

**Cons**:
- Requires manual configuration for background worker lifecycle and cross script messaging.
- Has faced maintenance gaps during major Vite releases.

### Option 3: Custom Vanilla Vite and Rollup Scripts

Building background, content scripts, and popup via custom multi-target Vite or Rollup configurations.

**Pros**:
- Zero external framework dependencies beyond standard Vite.

**Cons**:
- Heavy boilerplate for manifest generation, asset copy, and development hot reloading.
- High operational overhead to maintain when Chrome extension APIs update.

## Decision

**Chosen option**: Option 1: WXT with TypeScript, React, and Tailwind CSS

We adopt WXT with TypeScript, React, and Tailwind CSS for the extension foundation, alongside `@mozilla/readability` and `turndown` for client side markdown processing.

**Implementation skills**: `chrome-extensions` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`) · `chrome-devtools-axi` (`kunchenguid/chrome-devtools-axi`, `.agents/skills/chrome-devtools-axi/`) · `playwright-axi` (`playwright-axi`, `.agents/skills/playwright-axi/`) · `reactive-editor` (`reactive-editor`, `.agents/skills/reactive-editor/`)

## Rationale

WXT provides the cleanest developer experience and the most reliable Manifest V3 tooling available. It eliminates manual manifest maintenance and provides out of the box hot module replacement that works reliably across popup UI and background service workers. Pairing React with Tailwind CSS gives us composable UI building for popup states, settings panels, and badge feedback. Using Mozilla Readability and Turndown keeps all content extraction and markdown conversion 100% client side, guaranteeing privacy, zero network latency, and zero backend infrastructure costs.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Full static type safety across extension messaging and Chrome APIs |
| Extension Framework | WXT | Vite powered file based entry points, automatic Manifest V3, fast HMR |
| UI Framework | React 19 | Declarative UI state management for extension popup shell and settings |
| Styling | Tailwind CSS | Fast utility classes, lightweight scoped styling, responsive popup sizing |
| Content Extraction | @mozilla/readability | Industry standard DOM clutter stripping developed for Firefox Reader View |
| Markdown Conversion | Turndown + turndown-plugin-gfm | Flexible HTML to markdown conversion supporting tables, code, and strikethrough |
| Browser Automation & Test | Playwright & Chrome DevTools AXI | Automated browser testing and live agent interactive verification |

## Architectural execution boundaries

- **Execution Context**: Readability and Turndown execute strictly within the active tab content script environment where `document` and DOM APIs are present. The background service worker acts only as an event coordinator and file download trigger, avoiding DOM-less runtime crashes.
- **Content Script Injection Strategy**: Dynamic on-demand execution via `chrome.scripting.executeScript` when triggered, preventing unnecessary script overhead across every opened tab.
- **File Download Strategy**: The service worker invokes `chrome.downloads.download` with data URIs or object URLs passed via typed messages from the extraction pipeline.
- **Manifest Permissions**: Declared with minimal privilege: `activeTab` (contextual tab access without broad host permissions), `scripting` (on-demand extraction injection), and `downloads` (local file saving).
- **Frontmatter Metadata Schema**: Baseline YAML frontmatter includes `title`, `source` (URL), `author`, `published`, and `clipped_at` (ISO timestamp).

## Consequences

**Positive**:
- Fast local development cycle with automated manifest generation and hot reloading.
- Zero server costs or privacy risks: content parsing and file downloads happen locally.
- Clean component architecture for future popup and options UI extensions.

**Negative / tradeoffs**:
- Bundle size includes React runtime in the popup bundle (approx 40KB gzipped).
- Readability requires a DOM or DOM clone in the tab context, consuming temporary memory on heavy pages.

**Neutral**:
- Project relies on WXT file based directory conventions (`entrypoints/popup/`, `entrypoints/background.ts`).

## Follow-up

- [ ] Execute project scaffolding via WXT template in `/develop stack and architecture`.
- [ ] Run `/audit` following scaffolding to capture root `AGENTS.md` coding standards.
- [ ] Connect reactive-editor dev server bridge once popup dev mode is runnable.

## References

**Project sources**:
- `docs/scope/scope.md`: Feature 1 Stack and architecture scope requirements.
- Installed skills: `chrome-devtools-axi`, `playwright-axi`, `reactive-editor`, `chrome-extensions`.

**Practices & standards**:
- Chrome Extensions Manifest V3 migration and service worker lifecycle guidelines.
- Firefox Readability content parsing standard.

**Links**:
- WXT Extension Framework: https://wxt.dev
- Chrome Extension Manifest V3 Guide: https://developer.chrome.com/docs/extensions/mv3/intro/

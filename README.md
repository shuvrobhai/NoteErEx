# NoteErEx (নোটের এক্সটেনশন)

A Manifest V3 browser extension that extracts clean content from web pages and
dispatches it to note-taking destinations. Save articles and highlighted
passages as Markdown with YAML frontmatter — to disk, to Obsidian, or to both
at once. No tracking, no external servers.

## What is NoteErEx

The name comes from the Bengali phrase **নোটের এক্সটেনশন** (*Note Er
Extension*). *Not-er* (নোটের) means *of notes*, so the name reads as **The
Extension of Notes**.

Most web clippers lock you into one app or dump cluttered HTML into your
notes. NoteErEx extracts clean content in the browser, normalizes it into a
canonical payload, and lets destination adapters format it for wherever you
want it to land.

## Highlights

- **Full article clipping** — Mozilla Readability extracts body text, author,
  date, and description. Turndown converts to GitHub Flavored Markdown.
- **Selected text clipping** — highlight any passage and clip only that,
  with `type: highlight` frontmatter and rich formatting (links, bold, code)
  preserved.
- **Keyboard shortcut** — `Ctrl+Shift+M` on Windows/Linux, `Command+Shift+M`
  on macOS. Clips without opening the popup. Remappable in
  `chrome://extensions/shortcuts`.
- **Structured YAML frontmatter** — title, source, author, date, word count,
  reading time. Optional fields are omitted when unavailable, never left empty.
- **Multi-destination dispatch** — dispatch to local download and Obsidian in
  one action. Individual adapter failures don't cancel other destinations.
- **Privacy first** — all extraction and conversion happens locally. No
  telemetry, no third-party servers, minimal permissions (`activeTab`,
  `scripting`, `downloads`, `storage`, `notifications`).
- **Dark mode** — popup adapts to system preference automatically.

## Getting started

### Prerequisites

- Node.js 20 or later
- pnpm (`npm install -g pnpm`)

### Install

```bash
git clone https://github.com/shuvrobhai/NoteErEx.git
cd NoteErEx
pnpm install
```

`postinstall` runs `wxt prepare` to generate extension types.

### Develop

```bash
pnpm run dev            # Chrome with HMR
pnpm run dev:firefox    # Firefox
```

### Build and load

```bash
pnpm run build          # outputs to .output/chrome-mv3
pnpm run zip            # packaged archive for distribution
```

To load in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** (top left)
4. Select `.output/chrome-mv3`

### Test and check

```bash
pnpm run test           # Vitest with happy-dom
pnpm run typecheck      # tsc --noEmit
pnpm run lint           # ESLint
pnpm run format:check   # Prettier
node verify-runtime.mjs # Playwright runtime check against the built extension
```

## How it works

1. **Extract** — Mozilla Readability runs in the active tab via
   `browser.scripting.executeScript`. If text is selected, the DOM range is
   cloned and sanitized instead.
2. **Normalize** — content and metadata become a `CanonicalNotePayload` with
   markdown, clean HTML, plain text, and a metadata object.
3. **Convert** — Turndown produces GitHub Flavored Markdown. `js-yaml`
   serializes the frontmatter block.
4. **Dispatch** — `DispatchEngine` runs each configured adapter concurrently.
   Local download uses a data URL routed through the background service worker
   so it survives popup close. Obsidian uses the `obsidian://new` URI scheme.

The pipeline is orchestrated by `executeClip` in
`entrypoints/schema/clipPipeline.ts`. Both the popup and the keyboard shortcut
call it — no duplicated logic.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | WXT (Vite-based Manifest V3) |
| UI | React 19 + Tailwind CSS v4 |
| Extraction | Mozilla Readability |
| Conversion | Turndown + turndown-plugin-gfm |
| Serialization | js-yaml |
| Validation | Zod |
| Testing | Vitest + happy-dom, Playwright for runtime |
| Package manager | pnpm |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how the system works today
- [`docs/roadmap.md`](docs/roadmap.md) — what ships next
- [`docs/decisions.md`](docs/decisions.md) — why certain choices were made
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`AGENTS.md`](AGENTS.md) — conventions for contributors and AI agents

## License

MIT.
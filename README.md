# NoteErEx (নোটের এক্সটেনশন)

The universal browser extension for web capture and multi destination note dispatch. Save clean articles and highlighted passages directly into Obsidian, Notion, Google Docs, Apple Notes, Apple Pages, or local Markdown files with zero tracking.

## What is NoteErEx

The name NoteErEx comes from the Bengali phrase **নোটের এক্সটেনশন** (*Note Er Extension*). In Bengali grammar, *Not-er* (নোটের) translates to *of notes*. The name literally means **The Extension of Notes**, an open source companion created for anyone who collects knowledge across the web.

Most web clippers force you into a single proprietary app or capture cluttered web pages full of ads and trackers. NoteErEx is designed as a universal content pipeline. It extracts clean page content in your browser, creates an intermediate representation, and converts it into the exact structure required by your target knowledge base. Whether you need markdown with YAML frontmatter for Obsidian, structured blocks for Notion, or rich text for Apple Notes and Google Docs, NoteErEx delivers clean content to your preferred workspace.

## System Architecture

NoteErEx processes web content through a modular extraction and adapter pipeline:

```text
[ Web Page / Selection ]
           │
           ▼
[ Mozilla Readability & DOM Extractor ]
           │
           ▼
[ Normalized Intermediate Representation ]
           │
 ┌─────────┼─────────┬──────────────┬──────────────┬─────────────┐
 │         │         │              │              │             │
 ▼         ▼         ▼              ▼              ▼             ▼
Local   Obsidian   Notion     Google Docs    Apple Notes    Apple Pages
(MD)     (URI)     (Blocks)      (REST)       (Rich Text)     (Docx/RTF)
 └─────────┴─────────┼──────────────┴──────────────┴─────────────┘
                     ▼
       [ Multi Destination Dispatcher ]
    (Send to multiple targets simultaneously)
```

## Highlights

- **Full article clipping**: Extracts headlines, author metadata, publication dates, and core body text using Mozilla Readability.
- **Selected text clipping**: Highlight any text passage on a page to save just that excerpt, preserving source metadata and an excerpt tag.
- **Keyboard shortcut trigger**: Press `Alt+Shift+C` (or `Option+Shift+C` on macOS) to clip immediately without opening the popup interface.
- **Structured YAML frontmatter**: Generates title, source URL, author, published date, word count, and clip timestamps ready for Obsidian, Logseq, and static site generators.
- **Multi destination vision**: Built to dispatch notes to multiple apps like Obsidian, Notion, Google Docs, and Apple Notes simultaneously.
- **Privacy first**: Operates entirely client side with zero tracking, zero external telemetry, and no third party server dependencies.
- **Adaptive design**: Compact popup interface built with Tailwind CSS that automatically respects your system light or dark theme.

## Project Roadmap

NoteErEx is developed in vertical milestones, expanding from a solid local markdown clipper into an omnichannel note dispatcher.

### Phase 1: Local Foundation (Completed)
- [x] Clean DOM extraction using Mozilla Readability in isolated tab contexts
- [x] Selected text excerpt extraction with source metadata
- [x] HTML to GitHub Flavored Markdown conversion via Turndown
- [x] Structured YAML frontmatter generation with metadata sanitization
- [x] Resilient background service worker download loop using data URLs
- [x] Global keyboard shortcut trigger (`Alt+Shift+C` / `Option+Shift+C`)
- [x] Compact popup user interface with dark mode and live tab previews
- [x] End to end runtime verification with Vitest and Playwright

### Phase 2: Obsidian Integration (In Progress)
- [ ] Direct vault integration via Obsidian URI protocol (`obsidian://new`)
- [ ] Configurable target vaults and folder paths
- [ ] Wikilink formatting and internal linking options
- [ ] Daily note appending mode for research snippets

### Phase 3: Notion Workspace Exporter
- [ ] Notion API client integration via OAuth or secure internal integration tokens
- [ ] Conversion from intermediate representation into Notion block objects
- [ ] Database page creation with automated property mapping for author, URL, and date
- [ ] Workspace database selector in the extension settings

### Phase 4: Google Docs and Apple Ecosystem
- [ ] Google Docs REST API export with native document heading and list structures
- [ ] Apple Notes integration using rich text clipboard and native URL schemes
- [ ] Apple Pages export adapter for formatted document creation
- [ ] Clean rich text formatting for standard clipboard paste operations

### Phase 5: Multi Destination Parallel Dispatch
- [ ] Simultaneous multi target export (save to a local Obsidian vault and a remote Notion database in one action)
- [ ] Independent per destination status indicators and failure isolation
- [ ] Batch retry support for transient network failures

### Phase 6: Custom Preset Manager and Options Page
- [ ] Dedicated extension options page for credential storage and default settings
- [ ] Domain specific CSS selector presets to remove stubborn site clutter
- [ ] Custom note templates using configurable token replacement

## Tech Stack

- **Framework**: WXT (Vite based Manifest V3 framework)
- **UI library**: React 19
- **Styling**: Tailwind CSS v4
- **Parsing and conversion**: Mozilla Readability, Turndown, Turndown GFM, and js-yaml
- **Package manager**: pnpm
- **Testing**: Vitest with happy-dom and Playwright runtime verification

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm package manager (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/shuvrobhai/NoteErEx.git
cd NoteErEx

# Install dependencies and generate extension types
pnpm install
```

### Development

```bash
# Start the local development server with Chrome hot reload
pnpm run dev

# Start development server for Firefox
pnpm run dev:firefox
```

### Building the Extension

```bash
# Build the production extension for Chrome
pnpm run build

# Package into a zip archive for distribution
pnpm run zip
```

The production build outputs to `.output/chrome-mv3`.

### Loading into Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `.output/chrome-mv3` folder inside your project directory.
5. NoteErEx is now installed and ready to use from your extensions toolbar.

## Running Tests and Quality Checks

```bash
# Run unit and integration tests
pnpm run test

# Check TypeScript types
pnpm run typecheck

# Run linter checks
pnpm run lint

# Check code formatting
pnpm run format:check

# Run automated browser runtime verification
node verify-runtime.mjs
```

## How It Works

1. **Extraction**: When triggered, the extension queries the active tab and runs Mozilla Readability in an isolated context to extract clean article markup. If you highlighted text, it extracts and sanitizes the DOM selection instead.
2. **Intermediate Representation**: The captured content and metadata are standardized into an intermediate format with title, author, source URL, excerpt, and word count.
3. **Conversion**: Turndown converts the HTML into clean GitHub Flavored Markdown, and js-yaml generates the structured header.
4. **Safe Download**: The markdown string is formatted as a UTF-8 data URL and passed to the background service worker, ensuring the download completes reliably even if the popup window closes immediately.

## License

MIT License. Open source and free to use.

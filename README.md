# NoteErEx (নোটের এক্সটেনশন)

A fast, offline first Chrome extension that saves web articles and highlighted text into clean markdown files with YAML frontmatter, ready for your notes.

## What is NoteErEx

NoteErEx (a play on the phrase Note Er Extension, meaning an extension for notes) is a browser extension built on Manifest V3. Many web clippers require cloud accounts, track reading habits, or capture messy page clutter. NoteErEx runs entirely inside your browser. It parses article content, strips away headers, footers, and ads, and downloads clean markdown directly to your computer.

## Highlights

- **Full article clipping**: Extracts the headline, author, publication date, and main body using Mozilla Readability, then converts HTML to formatted markdown.
- **Selected text clipping**: Highlight any text passage on a page to save just that excerpt, complete with source metadata and a highlight tag.
- **Keyboard shortcut trigger**: Press `Alt+Shift+C` (or `Command+Shift+M` on macOS) to clip immediately without opening the popup window.
- **Structured YAML frontmatter**: Includes title, source URL, author, published date, word count, and clip timestamp for note taking apps like Obsidian and Logseq.
- **Privacy first**: Runs completely client side with zero tracking, zero external telemetry, and no third party server dependencies.
- **Adaptive modern design**: Compact popup interface built with Tailwind CSS that automatically matches your light or dark system theme.

## Tech stack

- **Framework**: WXT (Vite based Manifest V3 framework)
- **UI library**: React 19
- **Styling**: Tailwind CSS v4
- **Parsing and conversion**: Mozilla Readability, Turndown, Turndown GFM, and js-yaml
- **Package manager**: pnpm
- **Testing**: Vitest with happy-dom and Playwright runtime verification

## Getting started

### Prerequisites

- Node.js 20 or later
- pnpm package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/shuvrobhai/NoteErEx.git
cd NoteErEx

# Install dependencies and prepare extension types
pnpm install
```

### Development

```bash
# Start the local development server with Chrome hot reload
pnpm run dev

# Start development server for Firefox
pnpm run dev:firefox
```

### Building the extension

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

## Running tests

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

## How it works

1. **Extraction**: When triggered, the extension queries the active tab and runs Mozilla Readability in an isolated context to extract clean article markup. If you highlighted text, it extracts and sanitizes the DOM selection instead.
2. **Conversion**: Turndown converts the HTML into clean GitHub Flavored Markdown.
3. **Frontmatter**: The extension builds a YAML header containing source metadata and word counts.
4. **Safe download**: The final markdown string is formatted as a UTF-8 data URL and sent to the background service worker, ensuring the download completes even if the popup closes immediately.

## License

MIT License. Open source and free to use.

# 0006. Keyboard shortcut trigger

**Date**: 2026-09-20
**Status**: Proposed

## Summary

This specification defines the keyboard shortcut trigger for Web to Markdown (Feature 7, Slice 3). Pressing a registered browser command hotkey clips the active page, or the current text selection, to markdown without opening the popup, then shows a brief status notification. The command listener runs in the background service worker, receives the active tab and the `activeTab` grant automatically, and reuses the extraction, conversion, and download pipeline from Feature 5.

## Context

Web to Markdown currently clips pages through the action popup. The popup flow works well for deliberate clipping, but it requires two interactions (open the popup, then click download) and the popup unmounts the moment the user clicks away. For users who clip many pages in a session, a single keystroke is much faster.

Chrome extensions support this through the Commands API. Commands are declared in the manifest under the `commands` key, bound to a default key combination, and dispatched to the background service worker through `browser.commands.onCommand`. Crucially, executing a command grants the `activeTab` permission, so the extension can inject the extraction runner into the current tab without any broad host permissions and without the user clicking the extension icon.

The keyboard shortcut therefore needs its own pipeline entry point. Unlike the popup flow, there is no React popup to run conversion or display status. The background service worker must drive the whole sequence: validate the tab URL, inject the runner, convert the extracted article to markdown, trigger the download, and surface the outcome to the user. Because the service worker has no visible UI, user feedback must come from a system notification or the extension badge.

Feature 5 established the extraction runner and the background download handler. Feature 6 added selection detection. The shortcut reuses both, so this slice is mostly wiring plus a feedback mechanism.

## Requirements

**User stories**:
- As a user, I want to press a keyboard shortcut and have the current page clipped to markdown without opening the popup.
- As a user, I want the shortcut to respect any text I have selected, so a selection clips just that passage.
- As a user, I want a brief confirmation when the clip succeeds and a clear message when it fails, so I know what happened without checking the downloads folder.
- As a user, I want to remap the shortcut if the default conflicts with another extension or my own habits.

**Acceptance criteria**:
- **AC-1**: The manifest declares a `clip-to-markdown` command with default suggested key `Ctrl+Shift+M` on Windows, Linux, and ChromeOS and `Command+Shift+M` on macOS, with a description shown in `chrome://extensions/shortcuts`, and the user can remap it there.
- **AC-2**: Pressing the shortcut on a supported page triggers extraction of the active tab without opening the popup, and the `activeTab` permission is granted by the command gesture so no broad host permissions are required.
- **AC-3**: If the page has an active text selection, the shortcut clips only the selected passage with `type: highlight` frontmatter (Slice 2 behavior); otherwise it clips the full article (Feature 5 behavior).
- **AC-4**: The extracted content is converted to markdown with YAML frontmatter and saved via `browser.downloads.download` with a slugified `.md` filename, reusing the existing conversion, frontmatter, and download modules without duplication.
- **AC-5**: A successful clip shows a brief, self-dismissing system notification naming the saved file; unsupported URLs, extraction failures, and download failures show a descriptive error notification instead.
- **AC-6**: The shortcut applies the same URL guards as the popup flow and never injects scripts into `chrome://`, `edge://`, `about:`, `file://` (without explicit access), or Chrome Web Store pages.

## Options considered

### Option 1: Background command listener with a system notification (Chosen)

Register `clip-to-markdown` in `wxt.config.ts`, listen in `entrypoints/background.ts` via `browser.commands.onCommand`, run the full extraction and download pipeline from the service worker, and surface feedback with `browser.notifications.create`.

**Pros**:
- One keystroke clips and saves, with no popup interaction.
- The command gesture grants `activeTab`, so no new permissions and no host permission warning.
- Reuses the Feature 5 runner, conversion, and download modules.
- Works even when the popup is closed, which is the normal case for a shortcut.
- System notifications are visible regardless of which window has focus.

**Cons**:
- Conversion now runs in the service worker, which has no `document`; relies on Turndown bundling its own DOM parser.
- No rich in popup feedback, so error messages must fit in a notification.

### Option 2: Command opens the popup

Register a command bound to `_execute_action` so the shortcut opens the action popup, and let the existing popup UI drive the flow.

**Pros**:
- Reuses the popup UI and its status feedback entirely.
- No new extraction or conversion code.

**Cons**:
- Still requires a second click to actually download, so it does not save a step.
- `_execute_action` does not dispatch an `onCommand` event, so the extension cannot run custom logic on the key press itself.
- Defeats the stated purpose, which is clipping without the popup.

### Option 3: Persistent content script command bridge

Inject a content script on every page that listens for the shortcut and triggers extraction inside the page, downloading through an anchor element.

**Pros**:
- Conversion happens in the tab context, where a real `document` exists.

**Cons**:
- Requires broad host permissions, which triggers an intrusive install warning.
- Anchor element downloads fail when the tab loses focus, the same race condition Feature 5 solved.
- Duplicates the extraction pipeline and adds overhead to every page load.

## Decision

**Chosen option**: Option 1, background command listener with a system notification.

We declare `clip-to-markdown` in the WXT manifest, listen for it in the background service worker, and run the existing extraction, conversion, and download pipeline from there. Feedback is delivered through auto dismissing system notifications, with the extension badge used as a lightweight in progress indicator.

**Implementation skills**:
- `chrome-extensions` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`)
- `chrome-devtools-axi` (`kunchenguid/chrome-devtools-axi`, `.agents/skills/chrome-devtools-axi/`)
- `playwright-axi` (`playwright-axi`, `.agents/skills/playwright-axi/`)

## Rationale

Option 1 is the only approach that delivers the actual goal, which is clipping with a single key press and no popup. The Commands API is designed for exactly this: a manifest declared command bound to a key combination, dispatched to the background service worker, and paired with an automatic `activeTab` grant so the extension can reach the tab it needs without asking for permission to read every site.

Running the pipeline in the background service worker keeps the existing architecture intact. The background already owns the download lifecycle from Feature 5, and the extraction runner is injected on demand, so the shortcut simply becomes a second trigger for the same pipeline. The only genuinely new concern is user feedback, since there is no popup to render a status banner. A system notification is the natural fit: it is visible no matter which window has focus, it auto dismisses on its own, and the `notifications` permission is already declared.

The main tradeoff is that conversion runs in the service worker, which has no `document`. Turndown bundles `@mixmark-io/domino`, a pure JavaScript DOM implementation, so it parses HTML strings without a live browser DOM, and the conversion and frontmatter modules in `entrypoints/schema/` are already pure. If this proves unreliable during development, the fallback is to move conversion into the injected runner so the finished markdown string is returned to the worker. That fallback is recorded in the build plan and does not change the acceptance criteria.

## Feature design

**Command flow**:
```
User presses Ctrl+Shift+M (Cmd+Shift+M on macOS)
     │
     ▼
Background Service Worker (entrypoints/background.ts)
     │  browser.commands.onCommand listener receives (name, tab)
     │  validates isSupportedUrl(tab.url)
     │  sets badge "…" as an in progress indicator
     ▼
Injected Runner (readability-runner.ts via scripting.executeScript)
     │  detects window.getSelection() for a highlight clip
     │  runs Readability for a full article clip
     │  returns serializable ExtractedArticle or selection JSON
     ▼
Background Service Worker
     │  convertHtmlToMarkdown() + buildFrontmatter() (entrypoints/schema/)
     │  slugifyTitle() for the filename
     │  browser.downloads.download with a self contained data URL
     │  browser.notifications.create success or error notification
     │  clears the badge
     ▼
Disk File Saved (.md) + Brief Notification
```

**Command registration**:
The command is declared in `wxt.config.ts` under `manifest.commands`, since WXT generates the manifest from config rather than a source `manifest.json`:
```ts
manifest: {
  commands: {
    'clip-to-markdown': {
      suggested_key: {
        default: 'Ctrl+Shift+M',
        mac: 'Command+Shift+M',
      },
      description: 'Clip current page to markdown',
    },
  },
}
```
Chrome allows at most four suggested shortcuts per extension, and each must include Ctrl or Alt, so the default is safe. Users can remap it at `chrome://extensions/shortcuts`.

**Notification design**:
Notifications use `browser.notifications.create` with the already declared `notifications` permission. The notification type is `basic`, the icon is resolved with `browser.runtime.getURL(...)`, and `requireInteraction` is left at its default `false` so the notification dismisses itself after a few seconds.

- Success: title `Clipped to Markdown`, message names the saved file, for example `Saved article-title.md`.
- Unsupported URL: title `Cannot clip this page`, message explains that browser internal pages and the Web Store are not supported.
- Extraction failure: title `Clipping failed`, message suggests retrying after the page finishes loading.
- Download failure: title `Download failed`, message surfaces the error returned by the downloads API.

The extension badge is used as a transient indicator: `…` while the pipeline runs, cleared once the notification is shown. Badge text is best effort, because the service worker may terminate before a clear timer fires, so the badge is also cleared at the start of the next command.

**Selection handling**:
The injected runner reuses the Feature 6 selection detection. When `window.getSelection()` returns a non collapsed range, the runner returns the selection markup and the frontmatter uses `type: highlight`. When there is no selection, the runner runs Readability for a full article clip and the frontmatter uses the standard article type. This means the shortcut behaves exactly like the popup does when a selection is present.

**URL guard**:
The shortcut calls the same `isSupportedUrl` function used by the popup preview. To avoid importing popup code into the background bundle, that function and the runner invocation are moved to a shared module, for example `entrypoints/schema/extractor.ts`, importable by both the popup and the background. This is a small refactor of Feature 5 code, not new behavior.

**Message and handler surface**:
The background drives the pipeline directly, so no new runtime messages are needed. The existing `DOWNLOAD_MARKDOWN` message from Feature 5 is not used here, because the background performs the download itself rather than delegating to itself.

**API surface**:
| API                               | Direction            | Key inputs                    | Key outputs     | Context        | Key errors                          |
| --------------------------------- | -------------------- | ----------------------------- | --------------- | -------------- | ----------------------------------- |
| `browser.commands.onCommand`      | Chrome to background | `command: string`, `tab: Tab` | none            | Service worker | Unknown command name                |
| `browser.scripting.executeScript` | Background to tab    | `tabId`, runner file          | extraction JSON | Active tab     | Restricted URL, frame access denied |
| `browser.downloads.download`      | Background to Chrome | `url`, `filename`             | `downloadId`    | Service worker | Disk write error, invalid URL       |
| `browser.notifications.create`    | Background to Chrome | notification id, options      | notification id | Service worker | Permission denied                   |

**Value sourcing**:
| Action               | Value shown               | Source                                             |
| -------------------- | ------------------------- | -------------------------------------------------- |
| Command fires        | Active tab                | `tab` argument from `onCommand`                    |
| URL guard            | Supported or not          | `isSupportedUrl(tab.url)`                          |
| Extraction           | Article or selection JSON | Injected runner                                    |
| Markdown             | Body plus frontmatter     | `convertHtmlToMarkdown()` and `buildFrontmatter()` |
| Filename             | Slug ending in `.md`      | `slugifyTitle()`                                   |
| Success notification | Saved filename            | Download dispatch result                           |
| Error notification   | Error text                | URL guard, runner, or downloads failure            |

**Key invariants**:
- The command handler must never inject a script into an unsupported URL; the guard runs before any `executeScript` call.
- The download must use a self contained data URL, matching Feature 5, so it survives service worker termination.
- Notifications must never include raw page content, only the filename and a fixed message.
- No new permissions are added; `activeTab`, `scripting`, `downloads`, `storage`, and `notifications` are already declared.

**Security model**:
- The command gesture grants `activeTab`, so the extension touches only the tab the user invoked it on.
- The injected runner continues to execute in the extension isolated world, unchanged from Feature 5.
- Frontmatter values continue to be escaped through `js-yaml`, treating page text as untrusted input.

**Configuration required**:
- Add `commands` to `manifest` in `wxt.config.ts`. No permission changes.

**Critical test scenarios**:
- Full page clip: pressing the shortcut on an article page downloads markdown with frontmatter and shows a success notification, verifies **AC-1**, **AC-2**, **AC-4**, **AC-5**.
- Selection clip: pressing the shortcut with text selected downloads only the passage with `type: highlight` and shows a success notification, verifies **AC-3**, **AC-5**.
- Unsupported URL: pressing the shortcut on `chrome://extensions` shows the unsupported URL notification and never injects a script, verifies **AC-5**, **AC-6**.
- Extraction failure: pressing the shortcut on a page with no readable content shows the extraction failure notification, verifies **AC-5**.
- Download failure: simulating a downloads API rejection shows the download failure notification, verifies **AC-5**.
- Remap: changing the shortcut at `chrome://extensions/shortcuts` still triggers the command, verifies **AC-1**.

## Build plan

1. Add the `clip-to-markdown` command to `manifest.commands` in `wxt.config.ts` with the `suggested_key` and `description`, satisfies **AC-1**
2. Move `isSupportedUrl` and the runner invocation from `entrypoints/popup/services/extractor.ts` into a shared module under `entrypoints/schema/` and update the popup import, satisfies **AC-2**, **AC-6**
3. Implement the `browser.commands.onCommand` listener in `entrypoints/background.ts`, wiring tab validation, runner injection, conversion, and download into one pipeline, satisfies **AC-2**, **AC-3**, **AC-4**
4. Add selection aware branching so a present selection routes to the highlight clip and no selection routes to the full article clip, satisfies **AC-3**
5. Implement notification feedback for success, unsupported URL, extraction failure, and download failure, plus the transient badge indicator, satisfies **AC-5**
6. Add unit tests in `tests/shortcut.test.ts` covering command dispatch, URL guard reuse, selection branching, notification payloads, and download dispatch, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**
7. Verify in the browser with `node verify-runtime.mjs` and a manual shortcut press on a live page, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**

## Consequences

**Positive**:
- Clipping becomes a single keystroke, which is the fastest path the extension can offer.
- The feature reuses the Feature 5 and Feature 6 pipelines, so the new surface area is small.
- No new permissions are required, so the install warning does not change.
- The system notification works even when the browser window is not focused.

**Negative / tradeoffs**:
- Conversion now runs in the service worker, which depends on Turndown working without a browser `document`. If that fails, conversion must move into the injected runner.
- The user loses the rich popup status banner for shortcut initiated clips; error detail is limited to a notification.
- The default shortcut can conflict with another extension, in which case the user must remap it.

**Neutral**:
- If the popup happens to be open when the shortcut is pressed, it will not reflect the shortcut run and may show stale status until reopened.
- The command count stays well under Chrome's limit of four suggested shortcuts.

## Follow-up

- [ ] If Turndown proves unreliable in the service worker, move conversion into the injected runner and return the finished markdown string.
- [ ] Consider a settings surface for the default shortcut once the options page exists.
- [ ] Consider an image archive follow up from the deferred scope list that pairs naturally with shortcut initiated clips.

## References

**Project sources**:
- `docs/specs/0001-extension-stack-and-architecture.md`: Defines WXT, manifest generation, and the declared permission set.
- `docs/specs/0004-core-markdown-download-loop.md`: Defines the extraction runner, conversion, and background download pipeline reused here.
- `docs/specs/0005-selected-text-clipping.md`: Defines selection detection and highlight frontmatter reused here.
- `entrypoints/popup/services/extractor.ts`: Current home of `isSupportedUrl` and the runner invocation.
- `docs/scope/scope.md`: Slice 3 definition and scope tracking.

**Practices & standards**:
- Chrome Extensions Commands API and manifest `commands` key.
- Chrome Extensions `activeTab` grant on command execution.
- Chrome Extensions notifications API.

**Links**:
- chrome.commands API reference: https://developer.chrome.com/docs/extensions/reference/api/commands
- WXT manifest configuration guide: https://wxt.dev/guide/essentials/config/manifest
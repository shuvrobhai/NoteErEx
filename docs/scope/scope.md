# Scope: Web to Markdown Chrome Extension

A Manifest V3 browser extension that extracts web page content, converts it into clean markdown with YAML frontmatter, and downloads it locally.

**Build approach:** Tracer Bullet (build vertical slices end to end through every layer so each slice works completely).
**Workflow:** Alpha (after develop, run check verify against the real extension in the browser to confirm behavior). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack and architecture | Foundation | done |
| 2 | Coding standards and tooling | Foundation | done |
| 3 | Extension schema and settings | Foundation | done |
| 4 | Popup UI foundation | Foundation | planned |
| 5 | Core markdown download loop | Slice 1 | planned |
| 6 | Selected text clipping | Slice 2 | planned |
| 7 | Keyboard shortcut trigger | Slice 3 | planned |

## Foundations

### 1. Stack and architecture
Decide the Manifest V3 architecture, bundler setup, and HTML to markdown libraries, then scaffold the runnable project.
spec [0001](../specs/0001-extension-stack-and-architecture.md) · code in `entrypoints/`, `wxt.config.ts`
**Done when:** the stack is recorded in a spec and the extension loads without errors in Chrome developer mode.
- [x] Decide the stack (spec): `/architect stack and architecture`
- [x] Scaffold from the decision: `/develop stack and architecture`
- [x] Verify it: `/check verify stack and architecture`

### 2. Coding standards and tooling
Capture code standards, directory conventions, and linting rules into root `AGENTS.md`, then install tooling.
**Done when:** root `AGENTS.md` reflects the extension stack, and lint and type checks run clean.
- [x] Capture conventions and tooling choices: `/audit`
- [x] Install tooling and hooks: `/develop tooling`
- [x] Verify it: `/check verify tooling`

### 3. Extension schema and settings
Define storage keys, frontmatter metadata layout, and conversion options schemas.
**Done when:** the data schema defines frontmatter fields, storage keys, and error payloads cleanly.
spec [0002](../specs/0002-extension-schema-and-settings.md) · code in `entrypoints/schema/`, `wxt.config.ts`
- [x] Design it (spec): `/architect extension schema and settings`
- [x] Build it: `/develop extension schema and settings`
  - [x] Milestone 1: Schema definition and storage setup — TypeScript interfaces, manifest permissions, storage constants and defaults, satisfies **AC-1**, **AC-7**, **AC-9**
  - [x] Milestone 2: Core pipeline — runtime initialization, validation, frontmatter builder, satisfies **AC-2**, **AC-3**, **AC-8**
  - [x] Milestone 3: Presets and images — domain matching, image handling toggle, satisfies **AC-4**, **AC-5**
  - [x] Milestone 4: Error handling and download — error handler, Blob/object URL download, YAML escaping, satisfies **AC-6**
- [x] Verify it: `/check verify extension schema and settings`

### 4. Popup UI foundation · needs a decision
Visual styling, popup container, layout tokens, and status feedback components.
**Done when:** the popup shell renders with clear typography, status badges, and action button states.
- [ ] Design it (spec): `/architect popup UI foundation`

## Slice 1: Core markdown download loop

### 5. Core markdown download loop · needs a decision
Extract readable content from the active tab, generate markdown with YAML frontmatter, and trigger file download via Chrome downloads. This slice is the walking skeleton.
**Done when:** clicking the download button in the popup converts the active page to clean markdown with frontmatter and saves the file to disk.
- [ ] Design it (spec): `/architect core markdown download loop`

## Slice 2: Selected text clipping

### 6. Selected text clipping
Detect highlighted text on the active tab and convert only the selection to markdown while keeping frontmatter.
**Done when:** selecting text on a page and clicking download exports only the selected passage with source metadata.
- [ ] Build it: `/develop selected text clipping`

## Slice 3: Keyboard shortcut trigger

### 7. Keyboard shortcut trigger
Register a browser command hotkey in the manifest to trigger the markdown download instantly without clicking the popup.
**Done when:** pressing the configured shortcut downloads the current page markdown immediately and shows a brief notification.
- [ ] Build it: `/develop keyboard shortcut trigger`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Custom template options**: editable frontmatter and filename patterns in an options page · needs a decision
- **Note app URI integration**: send markdown directly to Obsidian or similar tools via URI protocols · needs a decision
- **Image assets archive**: download embedded images and package with markdown in a zip archive · needs a decision
- **Multi-destination export**: export markdown directly to multiple configured targets · needs a decision
- **Preset editor UI**: options page interface to manage site specific presets · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack and architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards and tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading overrides the project default for that feature; no tag inherits it.
- **Workflow tier tag** beside a heading sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

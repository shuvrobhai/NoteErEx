# Roadmap

What ships next. For the current design see `architecture.md`; for past
choices see `decisions.md`; for shipped features see `CHANGELOG.md`.

## Shipped

- Full article clipping (Readability + Turndown + YAML frontmatter)
- Selected text clipping with `type: highlight` frontmatter
- Keyboard shortcut trigger (`Ctrl+Shift+M` / `Cmd+Shift+M`)
- Local markdown download via data URL
- Multi-destination dispatch engine with local and Obsidian adapters
- `executeClip` pipeline unifying popup and shortcut paths

## In progress

**Slice 4 — Multi-destination dispatch (wiring)**

The engine and adapters exist but are not reachable from the UI. To finish:

- Wire `applyPreset` and `mergeConfig` into `executeClip` so preferences and
  presets actually apply. Currently ignored.
- Consolidate the two `DispatchEngine` instances into one singleton.
- Add destination toggles to the popup so users can pick Obsidian alongside
  local download.
- Create `entrypoints/options/` so the header gear icon works. First options
  page fields: Obsidian vault, note folder, default destinations.
- Harden `ObsidianAdapter`: clean up the background tab, detect handler
  failure instead of reporting `success: true` unconditionally.

See "Known gaps" in `architecture.md` for detail on each.

## Planned

**Slice 5 — Notion and Google Docs**
- Notion API client via OAuth or internal integration token
- `CanonicalNotePayload` → Notion block objects
- Database page creation with property mapping (author, URL, date)
- Google Docs REST export with native heading and list structures

**Slice 6 — Apple ecosystem**
- Apple Notes via rich text clipboard and URL scheme
- Apple Pages export as `.docx` / `.rtf`

## Deferred

Kept visible so they don't get lost, not committed to a slice:

- Custom note templates with token replacement
- Domain-specific CSS selector presets to strip site clutter
- Preset editor UI on the options page
- Image asset archive (download images and zip alongside markdown)
- `chrome.storage.sync` support if cross-device sync becomes a requirement
- Multiple authors as an array in frontmatter
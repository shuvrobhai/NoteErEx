# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-20

### Added
- Full article clipping to clean markdown with YAML frontmatter using Mozilla Readability and Turndown GFM.
- Selected text clipping to extract and sanitize highlighted DOM passages with highlight tags.
- Global keyboard shortcut command `clip-to-markdown` (`Alt+Shift+C` on Windows and Linux, `Command+Shift+M` on macOS) with system desktop notifications and badge status feedback.
- Accessible popup user interface with metadata preview cards, word count, reading time estimates, and dark mode support.
- Configurable conversion options and domain preset matching stored in browser local storage.
- Safe download dispatch using UTF-8 data URLs delegated to the background service worker.

### Changed
- Renamed the extension and package branding to NoteErEx (নোটের এক্সটেনশন).
- Standardized markdown filename generation with sanitized titles and highlight suffixes.
- Consolidated duplicated data models into schema types.

### Fixed
- Fixed an issue where character length was mistakenly recorded in frontmatter as word count.

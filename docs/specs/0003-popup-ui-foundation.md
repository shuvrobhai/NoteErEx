# 0003. Popup UI foundation

**Date**: 2026-09-20
**Status**: Proposed

## Summary

This specification establishes the visual layout, design tokens, and core components for the Web to Markdown action popup interface. We implement a clean modern minimalist design using React 19 and Tailwind CSS v4 that automatically adapts to the user's light or dark operating system theme. The popup provides a compact 380 pixel container featuring an informative header, a page preview card, a primary action button, and a structured status feedback component.

## Context

The Web to Markdown extension enables users to clip web page content into formatted markdown files. While the underlying extraction and conversion pipeline is implemented in background and schema modules, users interact primarily through the browser action popup. 

Extension popups run in a unique constrained micro environment. Unlike typical web applications, popups open on click and unmount immediately when the user clicks away. If the popup has poor dimensions, unwanted horizontal or vertical scrollbars appear. If loading or failure states are ambiguous, users cannot tell whether clipping succeeded or failed. 

Feature 4 lays down the visual design system, typography, layout tokens, and component architecture for the popup before live extraction logic is connected in Feature 5. This Tracer Bullet approach allows us to verify every visual state (idle, clipping, success, and error) in isolation with high fidelity.

## Requirements

**User stories**:
- As a user, I want the popup to open smoothly with clean modern styling so that reading page metadata feels intuitive and distraction free.
- As a user, I want the popup to adapt to my system light or dark mode automatically so that the interface does not cause eye strain.
- As a user, I want clear visual feedback when an action is running, complete, or failed so that I always know the current state.
- As a keyboard user, I want visible focus indicators and accessible controls so that I can navigate the popup without a mouse.

**Acceptance criteria**:
- **AC-1**: The popup container renders with a fixed width of 380 pixels and an adaptive height capped at 520 pixels, eliminating unexpected scrollbars.
- **AC-2**: The header displays the extension icon, title, version indicator, and an active preset badge showing the current domain configuration (e.g., "Default" or a matched preset).
- **AC-3**: The page preview card displays the target page title with clean text truncation for long titles, the source domain, and metadata preview chips (author, date, word count, and reading time).
- **AC-4**: The primary action button displays clear interactive states: idle, hover, active (pressed), loading with an animated spinner, and disabled.
- **AC-5**: The status feedback component provides four distinct accessible states: idle, in progress clipping, success with the saved filename, and error with a descriptive message and retry button.
- **AC-6**: Accessibility and theme baseline: colors meet WCAG AA contrast ratios, interactive elements exhibit visible focus outlines (`focus-visible:ring-2`), and status announcements use `aria-live="polite"`.

## Options considered

### Option 1: Clean modern minimalist with automatic dark mode (Chosen)
A refined neutral aesthetic inspired by modern macOS and Chrome native interfaces. Uses slate gray scales, subtle border dividers, crisp typography, and automatic dark mode adaptation via Tailwind CSS.

**Pros**:
- Blends seamlessly into native browser chrome in both light and dark themes.
- Lightweight with zero runtime CSS overhead.
- Excellent text readability and high contrast for metadata details.

**Cons**:
- Less flashy than decorative gradient styles.

### Option 2: Vibrant gradient with glassmorphism
A decorative aesthetic featuring translucent frosted glass card panels, vibrant purple and blue gradient buttons, and blurred backdrop filters.

**Pros**:
- Visually distinctive and expressive design.
- High initial aesthetic impact.

**Cons**:
- Backdrops and heavy blur filters can increase rendering latency in ephemeral popup windows.
- Maintaining accessible contrast across transparent layers in dark mode requires complex custom rules.

### Option 3: Ultra compact utility layout
A dense table style interface with small monospace typography, minimal padding, and compact icon buttons.

**Pros**:
- Maximizes screen space for technical data.
- Very small pixel footprint.

**Cons**:
- Feels cramped and intimidating to non-technical users.
- Small tap targets violate modern accessibility touch and click standards.

## Decision

**Chosen option**: Option 1: Clean modern minimalist with automatic dark mode.

We adopt a clean minimalist layout built with React 19 components and styled using Tailwind CSS v4 utility classes. The design relies on clean typography, distinct slate surfaces, clear borders, and high contrast accents.

**Implementation skills**:
- `chrome-extensions` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/chrome-extensions/`)
- `modern-web-guidance` (`googlechrome/modern-web-guidance`, `.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/`)
- `chrome-devtools-axi` (`kunchenguid/chrome-devtools-axi`, `.agents/skills/chrome-devtools-axi/`)

## Rationale

Option 1 provides the best combination of legibility, performance, and accessibility. In an action popup that opens and closes frequently, speed and clarity are paramount. Avoiding heavy backdrop filters keeps first paint nearly instantaneous, while neutral slate tokens with high contrast accents guarantee compliance with WCAG AA accessibility standards.

Automatic dark mode support ensures users working in dark environments receive an eye friendly interface without needing to toggle a manual switch.

## Feature design

**Component hierarchy**:
```
PopupLayout (380px container, bg-white dark:bg-slate-900)
├── Header (Branding, version, and active preset badge)
├── PagePreviewCard (Title, domain, and metadata chips)
├── StatusFeedback (Alert banner for idle, clipping, success, error)
└── ActionButton (Primary trigger with loading and disabled states)
```

**Design tokens (Tailwind CSS v4)**:
- **Surface light**: `bg-white`, `bg-slate-50` (card surface), `border-slate-200`
- **Surface dark**: `dark:bg-slate-900`, `dark:bg-slate-800` (card surface), `dark:border-slate-700`
- **Text light**: `text-slate-900` (primary), `text-slate-600` (secondary), `text-slate-400` (tertiary)
- **Text dark**: `dark:text-slate-100` (primary), `dark:text-slate-300` (secondary), `dark:text-slate-400` (tertiary)
- **Brand / Accent**: `bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600`
- **Status success**: `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800`
- **Status error**: `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800`

**Component state model**:
```ts
export type PopupStatus = 'idle' | 'clipping' | 'success' | 'error';

export interface PageMetadataPreview {
  title: string;
  domain: string;
  author?: string;
  date?: string;
  wordCount?: number;
  readingTime?: number;
  presetName: string;
}

export interface PopupState {
  status: PopupStatus;
  metadata: PageMetadataPreview;
  errorMessage?: string;
  successFilename?: string;
}
```

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Header render | Extension title & version | Extension manifest (`chrome.runtime.getManifest()`) |
| Header render | Preset name badge | Matched preset from `matchPreset()` or default "Default" |
| Preview render | Page title | Active tab `<title>` or fallback filename |
| Preview render | Domain name | Normalized hostname from active tab URL |
| Preview render | Metadata badges | Extracted page metadata or fallback preview state |
| Action click | Status transition | Component state handler (dispatches clipping state) |
| Feedback render | Status alert | Current `status` in component state |

**Key invariants**:
- The popup body width must never exceed 380 pixels or cause horizontal scrollbars.
- Interactive buttons must always provide a minimum 36 pixel tap target and distinct `:focus-visible` styling.
- All dynamic status changes must be accessible to screen readers via an `aria-live="polite"` container.

**Security model**:
- All preview values rendered in the DOM are bound via React text nodes, preventing HTML injection.
- No inline scripts or external stylesheets are loaded.
- Extension popup operates strictly within Manifest V3 content security policy.

**Critical test scenarios**:
- Initial render: Popup renders with header, preview card, action button, and idle state, verifies **AC-1**, **AC-2**, **AC-3**
- State transitions: Toggling clipping, success, and error states updates the action button and status banner accordingly, verifies **AC-4**, **AC-5**
- Text truncation: A very long article title truncates cleanly with ellipsis and does not expand the container width, verifies **AC-1**, **AC-3**
- Dark mode: Switching to dark color scheme adapts background, borders, and text colors properly, verifies **AC-6**
- Keyboard navigation: All interactive buttons are reachable via Tab key with visible focus rings, verifies **AC-6**

## Build plan

1. Configure Tailwind CSS v4 design tokens, color scheme adaptation, and base styles in `entrypoints/popup/style.css`, satisfies **AC-1**, **AC-6**
2. Create the `Header` component displaying extension branding, version, and the active preset badge, satisfies **AC-2**
3. Create the `PagePreviewCard` component with title truncation, source domain, and metadata chips, satisfies **AC-3**
4. Create the `ActionButton` component with hover, active, loading spinner, and disabled variants, satisfies **AC-4**
5. Create the `StatusFeedback` component with idle, clipping, success, and error alert variants, satisfies **AC-5**
6. Assemble `App.tsx` container layout with interactive state simulation for preview testing, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:
- Establishes a cohesive, accessible visual system for all future popup interactions.
- Allows immediate visual verification and automated testing with `chrome-devtools-axi` before Feature 5.
- Zero runtime CSS overhead through pre-compiled Tailwind CSS utilities.

**Negative / tradeoffs**:
- Component states in Feature 4 use mock/test data until live tab extraction is wired in Feature 5.

**Neutral**:
- Settings shortcut in the header is present as an icon button ready to link to the future options page.

## Follow-up

- [ ] Connect live active tab extraction in Feature 5 to replace preview mock data.
- [ ] Connect download dispatching in Feature 5 when the action button is clicked.

## References

**Project sources**:
- `docs/specs/0001-extension-stack-and-architecture.md`: Defines WXT, React 19, and Tailwind CSS stack
- `docs/specs/0002-extension-schema-and-settings.md`: Defines preset matching and metadata schema
- `docs/scope/scope.md`: Feature 4 scope row and definition of done
- `entrypoints/popup/`: Existing popup scaffold files

**Practices & standards**:
- Chrome Extension Action popup window design guidelines
- Modern Web Guidance for semantic HTML, focus management, and color-scheme
- WCAG 2.1 AA color contrast and keyboard navigation specifications

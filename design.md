# SmartChalk UI Design System

## Purpose

This document is the visual and interaction source of truth for the SmartChalk static application. It guides the redesign of every surface while preserving the current browser-local data model and static deployment architecture.

SmartChalk should feel **modern, bold, focused, and educational**. The experience should make complex content creation feel clear and capable rather than playful or visually busy.

> **Architecture boundary:** This is a UI and styling system. Do not introduce a backend, database, server synchronization, Supabase, Vercel Blob, or other persistence service as part of the redesign.

## Brand principles

SmartChalk combines the authority of near-black with the energy of chalk yellow. Black establishes focus, structure, and confidence. Yellow identifies action, progress, selection, and the creative spark of learning. Warm white keeps the light theme calm and usable.

The interface should use strong hierarchy, generous spacing, purposeful contrast, and clear action states. It should look like a professional educator’s workspace, not a generic dashboard template.

## Color system

| Token | Value | Role |
|---|---|---|
| `--sc-black` | `#111111` | Primary dark shell, headings, dark controls, footer. |
| `--sc-charcoal` | `#1F1F1F` | Dark cards, panels, hover surfaces. |
| `--sc-yellow` | `#FFC400` | Primary action, active navigation, key accent. |
| `--sc-yellow-bright` | `#FFD21F` | Hover, focus emphasis, highlights, selected markers. |
| `--sc-warm-white` | `#FFFDF7` | Light theme page and document surfaces. |
| `--sc-white` | `#FFFFFF` | Light cards and high-contrast content surfaces. |
| `--sc-paper` | `#F2F0EA` | Light theme application background. |
| `--sc-gray-700` | `#374151` | Primary secondary text. |
| `--sc-gray-500` | `#6B7280` | Supporting text and metadata. |
| `--sc-gray-300` | `#D9D5CB` | Light borders and separators. |
| `--sc-gray-100` | `#F4F2ED` | Subtle light surfaces. |

### Prohibited colors

The former Apex-associated green must not appear anywhere in the SmartChalk UI, theme, illustration system, status states, charts, templates, or generated materials. Do not use green, mint, teal, turquoise, lime, green-tinted gradients, or green-tinted shadows. Positive states should use yellow, black, warm white, or neutral gray treatment.

## Theme modes

### Dark theme — Command Center

The dark theme follows the approved Concept 1 direction. Use a near-black application shell, charcoal cards, warm-white text, yellow active navigation, and yellow primary actions. The theme should feel powerful and premium while preserving comfortable reading contrast.

Use black for the global shell and navigation. Use charcoal for grouped content panels. Use yellow sparingly for actions, selected states, progress, and emphasis. Avoid placing yellow behind large amounts of body text.

### Light theme — Editorial Workspace

The light theme follows the approved refined Concept 3 direction. Use a warm-white or paper background, white content cards, thin neutral borders, and a restrained black header or footer. Black may also appear in text, small controls, navigation labels, and compact action elements.

Do not place a large black block behind the main content in light mode. The main workspace should remain open, calm, and light. Yellow should mark active states and important actions without turning the page into a high-saturation field.

## Typography

Use Inter or the closest available system sans-serif. Headings should be bold and compact; body copy should be comfortable and neutral. Use sentence case for explanatory content and uppercase only for compact navigation labels, section eyebrows, and metadata.

| Style | Size | Weight | Use |
|---|---:|---:|---|
| Display | 2.75–3.25rem | 700–800 | Dashboard and landing headlines. |
| Page heading | 2–2.5rem | 700 | Main view titles. |
| Section heading | 1.25–1.5rem | 700 | Card and panel headings. |
| Body | 1rem | 400–500 | Explanatory content and form labels. |
| Metadata | 0.75–0.875rem | 500–700 | Dates, types, statuses, and compact labels. |

## Layout and spacing

Use a 4px base spacing unit. Prefer a 12-column desktop grid, a 6-column tablet grid, and a single-column mobile flow. Content should use a readable maximum width between 1120px and 1280px, with full-width dark shells and constrained inner content.

| Token | Value | Use |
|---|---:|---|
| `--sc-space-1` | 4px | Icon and label micro-spacing. |
| `--sc-space-2` | 8px | Compact control gaps. |
| `--sc-space-3` | 12px | Card internals and metadata. |
| `--sc-space-4` | 16px | Standard component padding. |
| `--sc-space-6` | 24px | Card padding and section gaps. |
| `--sc-space-8` | 32px | Page section spacing. |
| `--sc-space-12` | 48px | Major layout separation. |
| `--sc-space-16` | 64px | Hero and view-level spacing. |

Use 12–16px corner radii for cards and controls. Use pill shapes only for compact statuses, filters, or tags. Avoid excessive rounded containers that make every element look like a floating bubble.

## Core components

### Application shell

The shell contains the navigation, header context, content workspace, and footer. The dark shell uses black navigation and charcoal panels. The light shell uses a restrained black header or footer and a warm-white workspace.

### Navigation

Desktop navigation is a vertical rail or compact sidebar. The active item uses a yellow background or yellow indicator line with black text. Inactive items use warm-white or neutral-gray text. Mobile navigation becomes a compact top bar with a clear menu control.

### Header

The header should identify the current workspace and provide one primary action. Use the full SmartChalk logo where space permits and the transparent mark in compact navigation. Keep the header visually simple; do not compete with the page heading.

### Buttons

Primary buttons are black with yellow text in light mode, or yellow with black text in dark mode. Secondary buttons use transparent or white surfaces with charcoal borders. Destructive actions use a neutral outlined treatment and explicit copy rather than a red-heavy visual style.

Every button needs hover, active, disabled, loading, and keyboard-focus states. Never communicate state through color alone.

### Cards and panels

Cards group one meaningful task or piece of information. Use white cards with neutral borders in light mode and charcoal cards with subtle borders in dark mode. Cards should have a clear heading, supporting description, action area, and predictable padding.

### Forms

Inputs use high-contrast labels above the field, generous vertical padding, visible borders, and clear focus rings in yellow. Validation text should sit immediately below the related control. Forms should preserve user input during validation and generation errors.

### Tabs and filters

Use a compact segmented control or underline navigation. Active states use yellow fill or a yellow underline; inactive states remain quiet. Keep filters visually secondary to the content they control.

### Status, loading, and empty states

Use yellow and neutral tones for progress and positive confirmation. Use black text on warm-white surfaces for readable notices. Loading states should use a clear label and restrained animation. Empty states should explain what to do next and include one primary action.

### Modal and drawer

Use a warm-white or white modal surface with a strong black title, clear close control, and yellow primary action. The scrim should be black with moderate opacity. Keep modal content focused and avoid nested modals.

## Page patterns

### Dashboard

The dashboard opens with a concise greeting, a primary creation action, three or fewer useful metrics, recent activity, and quick-start actions. It should not become a dense analytics page.

### Generator views

Every generator follows a consistent structure: title and explanation, input/setup panel, generation action, loading state, result editor, save/export actions, and recovery or retry state. Keep the setup panel visually distinct from the generated content without creating a heavy black block in light mode.

### My Content

Use a searchable, filterable content library with compact type labels, recent-edit metadata, and clear open/export/delete actions. Cards should remain scannable at mobile widths.

### Settings

Group settings into provider configuration, browser-local workspace backup, appearance, and support. Keep local export/import prominent. Avoid exposing database or server-sync controls in the current static version.

### Generated outputs

Use the full SmartChalk logo for cover or title pages when space allows. Use the logo-only mark for compact headers, footers, slide templates, and document utility areas. Maintain the black-and-yellow visual identity without adding green accents.

## Responsive behavior

At widths below 1024px, reduce navigation width and use two-column content where it remains readable. At widths below 768px, collapse navigation, stack generator panels, make primary actions full-width where helpful, and move secondary actions into a compact toolbar. At widths below 480px, preserve 16px page padding, avoid horizontal scrolling, and keep touch targets at least 44px high.

## Accessibility

Use semantic headings in order, labels for every form control, keyboard-accessible navigation, visible focus rings, sufficient contrast, and descriptive button text. Provide status updates for generation and export actions. Do not rely on green, yellow, or any single color as the only state indicator. Respect reduced-motion preferences.

## Implementation sequence

1. Establish CSS variables and theme classes from this document.
2. Redesign the application shell, header, navigation, and footer.
3. Apply shared button, card, input, modal, tab, and status styles.
4. Redesign dashboard and generator layouts.
5. Redesign content library, settings, image workflows, and template cards.
6. Validate mobile layouts, keyboard focus, color contrast, branding, and static production build.

Any visual change should be checked against this document and `AGENTS.md` before being considered complete.
